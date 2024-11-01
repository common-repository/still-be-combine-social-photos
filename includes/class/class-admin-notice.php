<?php

namespace StillBE\Plugin\CombineSocialPhotos;

// Do not allow direct access to the file.
if( ! defined( 'ABSPATH' ) ) {
	exit;
}




class Admin_Notice {


	const PREFIX                      = 'still-be-common__';
	const OPTION_NAME_PRODUCTS_DATA   = self::PREFIX. 'products';
	const OPTION_NAME_DONATE_LINKS    = self::PREFIX. 'donate-links';

	const ACTION_HOOK_UPDATE_PRODUCTS = self::PREFIX. 'update_products';
	const ACTION_HOOK_UPDATE_DONATES  = self::PREFIX. 'update_donate_links';

	const API_URI_ALL_PRODUCTS        = 'https://api.still-be.com/wp/products.json';
	const API_URI_DONATE_LINKS        = 'https://api.still-be.com/wp/donate-links.json';
	const API_REQUEST_TIMEOUT         = 30;   // [sec]

	const CACHE_LIFETIME_DB           =  7 * 24 * 3600;   // [sec]

	const DISMISS_TIME_DONATE_LINK    = 90 * 24 * 3600;   // [sec]

	const DEFAULT_LOCALE              = 'en_US';


	private static $instance = null;


	public static function init() {

		if( empty( self::$instance ) ) {
			self::$instance = new self;
		}

		return self::$instance;

	}


	// Constructer
	private function __construct() {

		// Add Cron Action
		add_action( self::ACTION_HOOK_UPDATE_PRODUCTS, array( $this, 'update_product_data' ) );
		add_action( self::ACTION_HOOK_UPDATE_DONATES,  array( $this, 'update_donate_links' ) );

	}


	public function other_products_show() {

		$is_already_shown = $GLOBALS['still-be/plugin/common/other-products-shown'] ?? false;

		if( $is_already_shown ) {
			return;
		}

		$GLOBALS['still-be/plugin/common/other-products-shown'] = true;

		require_once( ABSPATH. 'wp-admin/includes/plugin.php' );

		$plugins  = get_plugins();
		$products = $this->get_products();

		$others = array();

		foreach( $products as $slug => $data ) {
			$is_not_installed = true;
			foreach( $plugins as $key => $plugin ) {
				if( 0 === strpos( $key, $slug. '/' ) ) {
					$is_not_installed = false;
					break;
				}
			}
			if( $is_not_installed ) {
				$others[] = $data;
			}
		}

		if( empty( $others ) ) {
			return;
		}

		echo '<aside class="sb-csp-other-plugins-wrapper">';
		echo   '<p>'. esc_html__( 'Also try these plugins!', 'still-be-combine-social-photos' ). '</p>';
		echo   '<ul class="sb-csp-other-plugins">';
		foreach( $others as $other ) {
			echo '<li>';
			echo   '<a href="'. esc_url( $other['download'] ). '">'. esc_html( $other['name'] ). '</a>';
			echo   '<span>'. esc_html( $other['outline'] ). '</span>';
			echo '</li>';
		}
		echo   '</ul>';
		echo '</aside>';

	}


	public function get_products() {

		$cache = get_option( self::OPTION_NAME_PRODUCTS_DATA, array() );

		if( empty( $cache['created'] ) || $cache['created'] + self::CACHE_LIFETIME_DB < time() ) {

			$get_scheduled_cron = wp_next_scheduled( self::ACTION_HOOK_UPDATE_PRODUCTS );

			// Set a Single WP-Cron
			if( empty( $get_scheduled_cron ) ) {
				wp_schedule_single_event(
					time() + 60,
					self::ACTION_HOOK_UPDATE_PRODUCTS
				);
			}

		}

		$products = isset( $cache['data'] ) ? $cache['data'] : array();

		$locale = get_locale();

		if( isset( $products[ $locale ] ) ) {
			return $products[ $locale ];
		}

		return isset( $products[ self::DEFAULT_LOCALE ] ) ? $products[ self::DEFAULT_LOCALE ] : array();

	}


	public function update_product_data() {

		$response = wp_remote_get( self::API_URI_ALL_PRODUCTS, array( 'timeout' => self::API_REQUEST_TIMEOUT ) );
		$json     = wp_remote_retrieve_body( $response );
		$code     = wp_remote_retrieve_response_code( $response );

		if( is_wp_error( $json ) || 200 != $code ) {
			return;
		}

		$data = @json_decode( $json, true );

		if( empty( $data ) ) {
			return;
		}

		$created = time();

		$cache = compact( 'data', 'created' );

		update_option( self::OPTION_NAME_PRODUCTS_DATA, $cache, false );

	}


	public function donate_links_show() {

		$is_already_shown = $GLOBALS['still-be/plugin/common/donate-link-shown'] ?? false;

		if( $is_already_shown ) {
			return;
		}

		$GLOBALS['still-be/plugin/common/donate-link-shown'] = true;

		$cache = get_option( self::OPTION_NAME_DONATE_LINKS, array() );

		if( empty( $cache['created'] ) || $cache['created'] + self::CACHE_LIFETIME_DB < time() ) {

			$get_scheduled_cron = wp_next_scheduled( self::ACTION_HOOK_UPDATE_DONATES );

			// Set a Single WP-Cron
			if( empty( $get_scheduled_cron ) ) {
				wp_schedule_single_event(
					time() + 60,
					self::ACTION_HOOK_UPDATE_DONATES
				);
			}

		}

		$donate_links = isset( $cache['data'] ) ? $cache['data'] : array();

		$locale = get_locale();

		if( isset( $donate_links [ $locale ] ) ) {
			echo wp_kses_post( $donate_links [ $locale ] );
		} else {
			echo wp_kses_post( isset( $donate_links [ self::DEFAULT_LOCALE ] ) ? $donate_links [ self::DEFAULT_LOCALE ] : '' );
		}

		echo '
			<script>
				(function($dismissLifetimeInSec){
					const notices = document.getElementsByClassName("sb-dismissible-notice");
					Array.prototype.forEach.call(notices, $notice => {
						const button = $notice.querySelector(".notice-dismiss");
						button.addEventListener("click", $e => {
							$notice?.remove();
							localStorage.setItem("still-be-donate-links-visibility", "hidden");
							localStorage.setItem("still-be-donate-links-dismissed", new Date().getTime());
						}, false);
						const visibility = localStorage.getItem("still-be-donate-links-visibility") || "visible";
						const dismissed  = localStorage.getItem("still-be-donate-links-dismissed")  || 0;
						if(visibility === "hidden" && dismissed * 1 + $dismissLifetimeInSec * 1e3 > new Date().getTime()){
							$notice?.remove();
						}
					});
				})('. absint( self::DISMISS_TIME_DONATE_LINK ). ');
			</script>
		';

	}


	public function update_donate_links() {

		$response = wp_remote_get( self::API_URI_DONATE_LINKS, array( 'timeout' => self::API_REQUEST_TIMEOUT ) );
		$json     = wp_remote_retrieve_body( $response );
		$code     = wp_remote_retrieve_response_code( $response );

		if( is_wp_error( $json ) || 200 != $code ) {
			return;
		}

		$data = @json_decode( $json, true );

		if( empty( $data ) ) {
			return;
		}

		$created = time();

		$cache = compact( 'data', 'created' );

		update_option( self::OPTION_NAME_DONATE_LINKS, $cache, false );

	}


}