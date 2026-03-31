<?php
/**
 * Activity Tracker REST API (file separato)
 */

defined('ABSPATH') || exit;

class Activity_Tracker_REST {
    public static function init() {
        add_action('rest_api_init', array(__CLASS__, 'register_routes'));
        add_action('init', array(__CLASS__, 'ensure_schema'));
    }

    public static function ensure_schema() {
        global $wpdb;
        $table = $wpdb->prefix . 'tf_attivita';

        if ($wpdb->get_var("SHOW TABLES LIKE '{$table}'") !== $table) {
            return;
        }

        $column = $wpdb->get_var("SHOW COLUMNS FROM {$table} LIKE 'user_key'");
        if (! $column) {
            $wpdb->query("ALTER TABLE {$table} ADD COLUMN user_key varchar(255) NULL AFTER user_id");
        }
    }

    public static function register_routes() {
        register_rest_route('activity-tracker/v1', '/attivita', array(
            'methods' => 'GET',
            'callback' => array(__CLASS__, 'get_attivita'),
            'permission_callback' => array(__CLASS__, 'rest_permission_callback'),
        ));

        register_rest_route('activity-tracker/v1', '/attivita', array(
            'methods' => 'POST',
            'callback' => array(__CLASS__, 'create_attivita'),
            'permission_callback' => array(__CLASS__, 'rest_permission_callback'),
            'args' => array(
                'id_argomento' => array('required' => true, 'validate_callback' => 'is_numeric'),
                'id_azione' => array('required' => true, 'validate_callback' => 'is_numeric'),
            ),
        ));

        register_rest_route('activity-tracker/v1', '/attivita/(?P<id>\d+)', array(
            array(
                'methods' => 'PATCH',
                'callback' => array(__CLASS__, 'update_attivita'),
                'permission_callback' => array(__CLASS__, 'rest_permission_callback'),
            ),
            array(
                'methods' => 'DELETE',
                'callback' => array(__CLASS__, 'delete_attivita'),
                'permission_callback' => array(__CLASS__, 'rest_permission_callback'),
            ),
        ));

        register_rest_route('activity-tracker/v1', '/attivita/chiudi', array(
            'methods' => 'POST',
            'callback' => array(__CLASS__, 'close_attivita'),
            'permission_callback' => array(__CLASS__, 'rest_permission_callback'),
        ));
    }

    public static function rest_permission_callback() {
        return is_user_logged_in();
    }

    public static function get_attivita($request) {
        global $wpdb;
        $user_id = get_current_user_id();
        $table = $wpdb->prefix . 'tf_attivita';

        $rows = $wpdb->get_results($wpdb->prepare(
            "SELECT * FROM {$table} WHERE user_id = %d ORDER BY ora_inizio DESC",
            $user_id
        ), ARRAY_A);

        return rest_ensure_response($rows);
    }

    public static function create_attivita($request) {
        global $wpdb;
        $user_id = get_current_user_id();
        $params = $request->get_json_params();

        $id_argomento = isset($params['id_argomento']) ? intval($params['id_argomento']) : 0;
        $id_azione = isset($params['id_azione']) ? intval($params['id_azione']) : 0;
        $descrizione = sanitize_text_field($params['descrizione'] ?? '');
        $note = sanitize_textarea_field($params['note'] ?? '');
        $user_key = sanitize_text_field(wp_get_current_user()->user_login ?? '');

        if ($id_argomento <= 0 || $id_azione <= 0) {
            return new WP_Error('invalid_data', __('id_argomento e id_azione sono obbligatori', 'activity-tracker'), array('status' => 422));
        }

        $table = $wpdb->prefix . 'tf_attivita';
        $now = current_time('mysql');

        $wpdb->update(
            $table,
            array('ora_fine' => $now),
            array('user_id' => $user_id, 'ora_fine' => null),
            array('%s'),
            array('%d', '%s')
        );

        $wpdb->insert(
            $table,
            array(
                'id_argomento' => $id_argomento,
                'id_azione' => $id_azione,
                'user_id' => $user_id,
                'user_key' => $user_key,
                'ora_inizio' => $now,
                'ora_fine' => null,
                'descrizione' => $descrizione,
                'note' => $note,
            ),
            array('%d', '%d', '%d', '%s', '%s', '%s', '%s', '%s')
        );

        $new_id = $wpdb->insert_id;
        $new_row = $wpdb->get_row($wpdb->prepare("SELECT * FROM {$table} WHERE id = %d", $new_id), ARRAY_A);
        return rest_ensure_response($new_row);
    }

    public static function update_attivita($request) {
        global $wpdb;
        $user_id = get_current_user_id();
        $id = intval($request->get_param('id'));
        $params = $request->get_json_params();

        $allowed = array('ora_inizio', 'ora_fine', 'descrizione', 'note', 'id_argomento', 'id_azione', 'user_key');
        $data = array();
        $format = array();

        foreach ($allowed as $field) {
            if (isset($params[$field])) {
                if (in_array($field, array('id_argomento', 'id_azione'), true)) {
                    $data[$field] = intval($params[$field]);
                    $format[] = '%d';
                } elseif (in_array($field, array('ora_inizio', 'ora_fine'), true)) {
                    $data[$field] = sanitize_text_field($params[$field]);
                    $format[] = '%s';
                } elseif ($field === 'descrizione') {
                    $data[$field] = sanitize_text_field($params[$field]);
                    $format[] = '%s';
                } elseif ($field === 'note') {
                    $data[$field] = sanitize_textarea_field($params[$field]);
                    $format[] = '%s';
                } elseif ($field === 'user_key') {
                    $data[$field] = sanitize_text_field($params[$field]);
                    $format[] = '%s';
                }
            }
        }

        if (empty($data)) {
            return new WP_Error('empty_data', __('Nessun campo passato', 'activity-tracker'), array('status' => 400));
        }

        $table = $wpdb->prefix . 'tf_attivita';
        $updated = $wpdb->update(
            $table,
            $data,
            array('id' => $id, 'user_id' => $user_id),
            $format,
            array('%d', '%d')
        );

        if ($updated === false) {
            return new WP_Error('db_error', __('Impossibile aggiornare attività', 'activity-tracker'), array('status' => 500));
        }

        $updated_row = $wpdb->get_row($wpdb->prepare("SELECT * FROM {$table} WHERE id = %d AND user_id = %d", $id, $user_id), ARRAY_A);
        return rest_ensure_response($updated_row);
    }

    public static function delete_attivita($request) {
        global $wpdb;
        $user_id = get_current_user_id();
        $id = intval($request->get_param('id'));
        $table = $wpdb->prefix . 'tf_attivita';

        $deleted = $wpdb->delete(
            $table,
            array('id' => $id, 'user_id' => $user_id),
            array('%d', '%d')
        );

        if ($deleted === false) {
            return new WP_Error('db_error', __('Impossibile eliminare attività', 'activity-tracker'), array('status' => 500));
        }

        return rest_ensure_response(array('deleted' => boolval($deleted)));
    }

    public static function close_attivita($request) {
        global $wpdb;
        $user_id = get_current_user_id();
        $table = $wpdb->prefix . 'tf_attivita';
        $now = current_time('mysql');

        $updated = $wpdb->update(
            $table,
            array('ora_fine' => $now),
            array('user_id' => $user_id, 'ora_fine' => null),
            array('%s'),
            array('%d', '%s')
        );

        if ($updated === false) {
            return new WP_Error('db_error', __('Impossibile chiudere attività', 'activity-tracker'), array('status' => 500));
        }

        return rest_ensure_response(array('closed' => boolval($updated)));
    }
}

Activity_Tracker_REST::init();
