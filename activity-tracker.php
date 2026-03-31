<?php
/**
 * Plugin Name: Activity Tracker
 * Plugin URI: https://github.com/tuonome/activity-tracker
 * Description: Plugin WordPress con interfaccia Vue SPA per gestione attività giornaliera.
 * Version: 1.0.0
 * Author: Your Name
 * Author URI: https://your-website.example
 * Text Domain: activity-tracker
 * Domain Path: /languages
 */

defined('ABSPATH') || exit;

require_once plugin_dir_path(__FILE__) . 'rest.php';

final class Activity_Tracker_Plugin {
    private const MENU_SLUG = 'activity-tracker';
    private bool $enqueue_assets_for_shortcode = false;

    public function __construct() {
        add_action('admin_menu', array($this, 'add_admin_menu'));
        add_shortcode('activity_test', array($this, 'activity_test'));
        add_action('admin_enqueue_scripts', array($this, 'enqueue_assets'));
        add_action('wp', array($this, 'detect_shortcode_in_content'));
        add_action('wp_enqueue_scripts', array($this, 'enqueue_assets'));
        add_shortcode('activity_tracker', array($this, 'render_app_shortcode'));
        add_filter('script_loader_tag', array($this, 'script_loader_tag'), 10, 3);
        add_action('rest_api_init', array($this, 'register_rest_endpoints'));
        register_activation_hook(__FILE__, array($this, 'on_activation'));
        register_deactivation_hook(__FILE__, array($this, 'on_deactivation'));
    }

    public function add_admin_menu(): void {
        add_menu_page(
            __('Activity Tracker', 'activity-tracker'),
            __('Activity Tracker', 'activity-tracker'),
            'manage_options',
            self::MENU_SLUG,
            array($this, 'render_app_page'),
            'dashicons-clock',
            55
        );
    }

    public function activity_test(): void {
        echo "<div>ciao patata</div> <br>";
    }

    public function enqueue_assets(string $hook = ''): void {
        $is_admin_screen = is_admin() && $hook === 'toplevel_page_' . self::MENU_SLUG;
        $is_frontend_shortcode = ! is_admin() && is_singular() && has_shortcode(get_post()?->post_content ?? '', 'activity_tracker');

        if ($is_frontend_shortcode) {
            $this->enqueue_assets_for_shortcode = true;
        }

        if (! $is_admin_screen && ! $this->enqueue_assets_for_shortcode) {
            return;
        }

        $this->enqueue_activity_tracker_assets();
    }

    private function enqueue_activity_tracker_assets(): void {
        $manifest_path = plugin_dir_path(__FILE__) . 'frontend/dist/manifest.json';
        $main = '';
        $css_files = array();

        if (file_exists($manifest_path)) {
            $manifest = json_decode(file_get_contents($manifest_path), true);
            if (is_array($manifest) && ! empty($manifest['src/main.js'])) {
                $main = $manifest['src/main.js']['file'] ?? '';
                $css_files = $manifest['src/main.js']['css'] ?? array();
            }
        }

        // Fallback se non esiste manifest (build senza manifest producendo asset in dist/assets)
        if (empty($main)) {
            $assets_dir = plugin_dir_path(__FILE__) . 'frontend/dist/assets';
            $js_files = glob($assets_dir . '/index-*.js');
            $css_files = glob($assets_dir . '/index-*.css');

            if (! empty($js_files)) {
                $main = 'assets/' . basename($js_files[0]);
            }

            if (! empty($css_files)) {
                $css_files = array_map(fn($path) => 'assets/' . basename($path), $css_files);
            } else {
                $css_files = array();
            }
        }

        if (empty($main)) {
            add_action('admin_notices', function () {
                echo '<div class="notice notice-error"><p>' . esc_html__('Activity Tracker: impossibile trovare gli asset di build. Esegui npm install && npm run build in frontend.', 'activity-tracker') . '</p></div>';
            });
            return;
        }

        $script_handle = 'activity-tracker-app';

        wp_register_script(
            $script_handle,
            plugins_url('frontend/dist/' . $main, __FILE__),
            array(),
            filemtime(plugin_dir_path(__FILE__) . 'frontend/dist/' . $main),
            true
        );

        foreach ($css_files as $idx => $css) {
            wp_enqueue_style(
                "activity-tracker-style-{$idx}",
                plugins_url('frontend/dist/' . $css, __FILE__),
                array(),
                filemtime(plugin_dir_path(__FILE__) . 'frontend/dist/' . $css)
            );
        }

        wp_enqueue_script($script_handle);

        wp_localize_script($script_handle, 'ActivityTrackerConfig', array(
            'restUrl' => esc_url_raw(rest_url('activity-tracker/v1')),
            'nonce' => wp_create_nonce('wp_rest'),
            'pluginUrl' => plugins_url('', __FILE__),
        ));

        wp_add_inline_script($script_handle, '(function(){window.activityTrackerPlugin={baseUrl:"' . esc_js(plugins_url('', __FILE__)) . '"};})();');
    }

    public function render_app_page(): void {
        echo '<div class="wrap">';
        echo '<h1>' . esc_html__('Activity Tracker', 'activity-tracker') . '</h1>';
        echo '<div id="app"></div>';
        echo '</div>';
    }

    public function detect_shortcode_in_content(): void {
        if (! is_singular()) {
            return;
        }

        $post = get_post();
        if (! $post) {
            return;
        }

        if (has_shortcode($post->post_content, 'activity_tracker')) {
            $this->enqueue_assets_for_shortcode = true;
        }
    }

    public function render_app_shortcode($atts = array(), $content = null): string {
        return '<div class="activity-tracker-page"><div id="app"></div></div>';
    }

    public function script_loader_tag(string $tag, string $handle, string $src): string {
        if ($handle === 'activity-tracker-app') {
            $tag = sprintf('<script type="module" src="%s" id="%s"></script>', esc_url($src), esc_attr($handle));
        }
        return $tag;
    }

    public function register_rest_endpoints(): void {
        register_rest_route('activity-tracker/v1', '/status', array(
            'methods' => 'GET',
            'callback' => function () {
                return rest_ensure_response(array('ok' => true));
            },
            'permission_callback' => array($this, 'rest_permission_callback'),
        ));

        register_rest_route('activity-tracker/v1', '/argomenti', array(
            'methods' => 'GET',
            'callback' => array($this, 'get_argomenti'),
            'permission_callback' => array($this, 'rest_permission_callback'),
        ));

        register_rest_route('activity-tracker/v1', '/azioni', array(
            'methods' => 'GET',
            'callback' => array($this, 'get_azioni'),
            'permission_callback' => array($this, 'rest_permission_callback'),
        ));

        register_rest_route('activity-tracker/v1', '/attivita', array(
            'methods' => 'GET',
            'callback' => array($this, 'get_attivita'),
            'permission_callback' => array($this, 'rest_permission_callback'),
        ));

        register_rest_route('activity-tracker/v1', '/attivita/corrente', array(
            'methods' => 'GET',
            'callback' => array($this, 'get_attivita_corrente'),
            'permission_callback' => array($this, 'rest_permission_callback'),
        ));

        register_rest_route('activity-tracker/v1', '/attivita', array(
            'methods' => 'POST',
            'callback' => array($this, 'create_attivita'),
            'permission_callback' => array($this, 'rest_permission_callback'),
            'args' => array(
                'id_argomento' => array('required' => true, 'validate_callback' => 'is_numeric'),
                'id_azione' => array('required' => true, 'validate_callback' => 'is_numeric'),
            ),
        ));

        register_rest_route('activity-tracker/v1', '/attivita/(?P<id>\d+)', array(
            array(
                'methods' => 'PATCH',
                'callback' => array($this, 'update_attivita'),
                'permission_callback' => array($this, 'rest_permission_callback'),
            ),
            array(
                'methods' => 'DELETE',
                'callback' => array($this, 'delete_attivita'),
                'permission_callback' => array($this, 'rest_permission_callback'),
            ),
        ));

        register_rest_route('activity-tracker/v1', '/attivita/chiudi', array(
            'methods' => 'POST',
            'callback' => array($this, 'close_attivita'),
            'permission_callback' => array($this, 'rest_permission_callback'),
        ));
    }

    private function rest_permission_callback(): bool {
        return is_user_logged_in();
    }

    private function get_argomenti($request) {
        global $wpdb;
        $table = $wpdb->prefix . 'tf_argomenti';
        $rows = $wpdb->get_results("SELECT * FROM {$table} ORDER BY nome ASC", ARRAY_A);
        return rest_ensure_response($rows);
    }

    private function get_azioni($request) {
        global $wpdb;
        $table = $wpdb->prefix . 'tf_azioni';
        $rows = $wpdb->get_results("SELECT * FROM {$table} ORDER BY azione ASC", ARRAY_A);
        return rest_ensure_response($rows);
    }

    private function get_attivita($request) {
        global $wpdb;
        $user_id = get_current_user_id();
        $table = $wpdb->prefix . 'tf_attivita';
        $rows = $wpdb->get_results($wpdb->prepare(
            "SELECT * FROM {$table} WHERE user_id = %d ORDER BY ora_inizio DESC",
            $user_id
        ), ARRAY_A);
        return rest_ensure_response($rows);
    }

    private function get_attivita_corrente($request) {
        global $wpdb;
        $user_id = get_current_user_id();
        $table = $wpdb->prefix . 'tf_attivita';
        $row = $wpdb->get_row($wpdb->prepare(
            "SELECT * FROM {$table} WHERE user_id = %d AND ora_fine IS NULL ORDER BY ora_inizio DESC LIMIT 1",
            $user_id
        ), ARRAY_A);
        return rest_ensure_response($row ?: null);
    }

    private function create_attivita($request) {
        global $wpdb;
        $user_id = get_current_user_id();
        $params = $request->get_json_params();

        $id_argomento = isset($params['id_argomento']) ? intval($params['id_argomento']) : 0;
        $id_azione = isset($params['id_azione']) ? intval($params['id_azione']) : 0;
        $descrizione = sanitize_text_field($params['descrizione'] ?? '');
        $note = sanitize_textarea_field($params['note'] ?? '');

        if ($id_argomento <= 0 || $id_azione <= 0) {
            return new WP_Error('invalid_data', __('id_argomento e id_azione sono obbligatori', 'activity-tracker'), array('status' => 422));
        }

        $table = $wpdb->prefix . 'tf_attivita';
        $now = current_time('mysql');

        // Chiudi attività aperta corrente per lo user
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
                'ora_inizio' => $now,
                'ora_fine' => null,
                'descrizione' => $descrizione,
                'note' => $note,
            ),
            array('%d', '%d', '%d', '%s', '%s', '%s', '%s')
        );

        $new_id = $wpdb->insert_id;
        $new_row = $wpdb->get_row($wpdb->prepare("SELECT * FROM {$table} WHERE id = %d", $new_id), ARRAY_A);
        return rest_ensure_response($new_row);
    }

    private function close_attivita($request) {
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

    private function update_attivita($request) {
        global $wpdb;
        $user_id = get_current_user_id();
        $id = intval($request->get_param('id'));
        $params = $request->get_json_params();

        $allowed = array('ora_inizio', 'ora_fine', 'descrizione', 'note', 'id_argomento', 'id_azione');
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

    private function delete_attivita($request) {
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

    public function on_activation(): void {
        global $wpdb;

        $charset_collate = $wpdb->get_charset_collate();
        $table1 = $wpdb->prefix . 'tf_argomenti';
        $table2 = $wpdb->prefix . 'tf_azioni';
        $table3 = $wpdb->prefix . 'tf_attivita';

        require_once(ABSPATH . 'wp-admin/includes/upgrade.php');

        dbDelta("CREATE TABLE {$table1} (
            id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
            nome varchar(255) NOT NULL,
            id_padre bigint(20) unsigned NULL,
            descrizione text NULL,
            colore varchar(7) NULL,
            seChiuso tinyint(1) NOT NULL DEFAULT 0,
            PRIMARY KEY (id)
        ) {$charset_collate}");

        dbDelta("CREATE TABLE {$table2} (
            id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
            azione varchar(255) NOT NULL,
            PRIMARY KEY (id)
        ) {$charset_collate}");

        dbDelta("CREATE TABLE {$table3} (
            id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
            id_argomento bigint(20) unsigned NOT NULL,
            id_azione bigint(20) unsigned NOT NULL,
            user_id bigint(20) unsigned NOT NULL,
            ora_inizio datetime NOT NULL,
            ora_fine datetime NULL,
            descrizione text NULL,
            note text NULL,
            PRIMARY KEY (id),
            KEY user_id (user_id),
            KEY id_argomento (id_argomento),
            KEY id_azione (id_azione)
        ) {$charset_collate}");
    }

    public function on_deactivation(): void {
        // Non rimuovere i dati per sicurezza, se vuoi aggiungere pulizia qui
    }
}

new Activity_Tracker_Plugin();
