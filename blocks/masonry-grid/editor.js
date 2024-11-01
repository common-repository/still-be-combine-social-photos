(function(wp){

	"use strict";

	const { registerBlockType   } = wp.blocks;
	const { createElement,
	        useState,
	        useEffect,
	        Fragment,
	        Component,
	        render              } = wp.element;
	const { useBlockProps,
	        BlockControls,
	        RichText,
	        InnerBlocks,
	        InspectorControls,
	        UseInnerBlocksProps } = wp.blockEditor;
	const { SelectControl,
	        __experimentalUnitControl: UnitControl,
	        TextControl,
	        RangeControl,
	        ToggleControl,
	        RadioControl,
	        PanelBody,
	        PanelRow,
	        Button,
	        Toolbar,
	        ToolbarButton       } = wp.components;
	const { __, sprintf         } = wp.i18n;


	const icon = createElement(
		"svg",
		{
			xmlns   : "http://www.w3.org/2000/svg",
			viewBox : "0 0 448 512",
		},
		createElement(
			"path",
			{
				d: "M224.1 141c-63.6 0-114.9 51.3-114.9 114.9s51.3 114.9 114.9 114.9S339 319.5 339 255.9 287.7 141 224.1 141z" +
				   "m0 189.6c-41.1 0-74.7-33.5-74.7-74.7s33.5-74.7 74.7-74.7 74.7 33.5 74.7 74.7-33.6 74.7-74.7 74.7z" +
				   "m146.4-194.3c0 14.9-12 26.8-26.8 26.8-14.9 0-26.8-12-26.8-26.8s12-26.8 26.8-26.8 26.8 12 26.8 26.8z" +
				   "m76.1 27.2c-1.7-35.9-9.9-67.7-36.2-93.9-26.2-26.2-58-34.4-93.9-36.2-37-2.1-147.9-2.1-184.9 0-35.8 1.7-67.6 9.9-93.9 36.1" +
				   "s-34.4 58-36.2 93.9c-2.1 37-2.1 147.9 0 184.9 1.7 35.9 9.9 67.7 36.2 93.9s58 34.4 93.9 36.2" +
				   "c37 2.1 147.9 2.1 184.9 0 35.9-1.7 67.7-9.9 93.9-36.2 26.2-26.2 34.4-58 36.2-93.9 2.1-37 2.1-147.8 0-184.8z" +
				   "M398.8 388c-7.8 19.6-22.9 34.7-42.6 42.6-29.5 11.7-99.5 9-132.1 9s-102.7 2.6-132.1-9" +
				   "c-19.6-7.8-34.7-22.9-42.6-42.6-11.7-29.5-9-99.5-9-132.1s-2.6-102.7 9-132.1c7.8-19.6 22.9-34.7 42.6-42.6 29.5-11.7 99.5-9 132.1-9" +
				   "s102.7-2.6 132.1 9c19.6 7.8 34.7 22.9 42.6 42.6 11.7 29.5 9 99.5 9 132.1s2.7 102.7-9 132.1z",
			}
		)
	);


	registerBlockType( "combine-social-photos/masonry-grid", {

		icon: icon,

		edit: ( { attributes, setAttributes } ) => {

			const REST_API_NAMESPACE = window.$stillbe?.rest.namespace || '';

			const [ authUser,  setAuthUser  ] = useState( {} );
			const [ users,     setUsers     ] = useState( [] );

			const [ apiType,   setApiType   ] = useState( null );
			const [ igName,    setIgName    ] = useState( "" );

			const [ convBtn,   setConvBtn   ] = useState( {
				label    : __("Start Convertion", "still-be-combine-social-photos"),
				disabled : apiType !== "Graph API",
			} );

			// Observe a Fetch API
			window.fetch = new Proxy(window.fetch, {
				apply(fetch, that, args){
					const result = fetch.apply(that, args);
					result.then($res => {
						if($res.url.indexOf("block-renderer/combine-social-photos/masonry-grid") < 0){
							return;
						}
						if(!/complete|loaded/.test(document.readyState)){
							return;
						}
						setTimeout(window.__stillbe.func.setMasonryGrids, 50);
					});
					return result;
				}
			});

			// Get IG Users
			useEffect( () => {

				wp.apiFetch({ path: `${REST_API_NAMESPACE}/user` })

				.then(json => {
					if(!json.ok && json.data){
						Promise.reject(json.message || __("An error has occured.", "still-be-combine-social-photos"));
					}
					const newUsers  = [];
					const newIusers = [];
					for(const id in json.data){
						if(json.data[id].active){
							newUsers.push({
								label: json.data[id].name,
								value: id,
								api  : json.data[id].api,
							});
						}
						if(id == attributes.id){
							setIgName(json.data[id].name);
							setApiType(json.data[id].api);
						}
					}
					setUsers([{ label: __("-- Select User --", "still-be-combine-social-photos"), value: 0 }, ...newUsers]);
				})

				.catch(console.error);

			}, [ attributes.id ] );


			useEffect( () => {

				setConvBtn( {
					label    : __("Start Convertion", "still-be-combine-social-photos"),
					disabled : apiType !== "Graph API",
				} );

			}, [ apiType, attributes.hashtag ] );


			useEffect( () => {

				setAttributes({
					hasOutlineShadow: !/\bis-style-simple\b/i.test(attributes.className),
				});

			}, [ attributes.className ] );


			const convertHashtag = () => {

				const convBtnObj = Object.assign({}, convBtn);

				convBtnObj.label    = __("Converting...", "still-be-combine-social-photos");
				convBtnObj.disabled = true;
				setConvBtn(convBtnObj);

				wp.apiFetch({
					path   : `${REST_API_NAMESPACE}/hashtag/convert`,
					method : "POST",
					data   : {
						hashtag: attributes.hashtag,
						user_id: attributes.id,
					},
				})

				.then(json => {
					if(!json.ok){
						console.error(json);
						Promise.reject(json.message || __("An error has occured.", "still-be-combine-social-photos"));
						return;
					}
					convBtnObj.label = __("Converted!!", "still-be-combine-social-photos");
					setConvBtn({...convBtnObj});
					setAttributes({hashtagId: json.hashtag_id});
				})

				.catch($reason => {
					alert($reason.message);
					convBtnObj.label    = __("Start Convertion", "still-be-combine-social-photos");
					convBtnObj.disabled = false;
					setConvBtn({...convBtnObj});
				});

			};



			const usersProps = ({
				label    : __("Select IG User", "still-be-combine-social-photos"),
				options  : users,
				value    : attributes.id,
				onChange : value => {
					setAttributes({id: parseInt(value, 10)});
					for(const user of users){
						if(value == user.value){
							setIgName(user.label);
							setApiType(user.api);
							break;
						}
					}
				},
			});

			const authUserProps = ({
				variant : "secondary",
				text    : __("Link another account", "still-be-combine-social-photos"),
				onClick : openAuthWindow.bind(null, $id => setAttributes({id: parseInt($id, 10)})),
			});

			const gettingTypeProps = ({
				label    : __("Type of Getting Posts", "still-be-combine-social-photos"),
				selected : attributes.gettingType,
				options  : [
					{ label: __("My Own Recent Posts",                     "still-be-combine-social-photos"), value: "own"                },
					{ label: __("Other User's Recent Posts",               "still-be-combine-social-photos"), value: "business_discovery" },
					{ label: __("Recent Posts with Hashtag (within 24hr)", "still-be-combine-social-photos"), value: "hashtag_recent"     },
					{ label: __("Most Popular Posts with Hashtag",         "still-be-combine-social-photos"), value: "hashtag_top"        },
				],
				onChange : value => setAttributes({gettingType: value}),
			});


			/**
			 * Business Discovery
			 * 
			 */

			const businessDicoveryProps = ({
				label    : __("Other User's Username", "still-be-combine-social-photos"),
				disabled : apiType !== "Graph API",
				value    : attributes.businessDiscovery,
				onChange : value => setAttributes({businessDiscovery: String(value)}),
				help     : __("To get your own posts, leave blank. Get posts from another user. If you do not find them, check if the user you specified is not a professional account (BUSINESS or MEDIA CREATOR) or if the user name has been changed.", "still-be-combine-social-photos"),
			});


			/**
			 * Hashtag
			 * 
			 */

			const hashtagProps = ({
				label    : __("Hashtag", "still-be-combine-social-photos"),
				disabled : apiType !== "Graph API",
				value    : attributes.hashtag,
				onChange : value => setAttributes({hashtag: String(value).trim().toLowerCase()}),
				help     : __("The hashtag must be converted to an ID in Instagram, with a conversion frequency limit of 30 times per 7 days. ", "still-be-combine-social-photos") +
				           " " || __("To search by hashtag IDs converted by other users, please allow data to be sent to the Still BE server from the settings screen.", "still-be-combine-social-photos"),
			});

			const convertHashtagProps = ({
				variant : "secondary",
				disabled: convBtn.disabled,
				text    : convBtn.label,
				onClick : convertHashtag,
			});

			const hashtagIdProps = ({
				disabled  : true,
				value     : attributes.hashtagId,
				className : "display-none",
			});


			/**
			 * Video Option
			 * 
			 */

			const displayingVideoProps = ({
				label    : __("Displaying Video", "still-be-combine-social-photos"),
				selected : attributes.displayingVideo,
				options  : [
					{ label: __("Thumbnail", "still-be-combine-social-photos"), value: "thumbnail" },
					{ label: __("Ignore",    "still-be-combine-social-photos"), value: "ignore"    },
					{ label: __("Autoplay",  "still-be-combine-social-photos"), value: "autoplay"  },
				],
				onChange : value => setAttributes({displayingVideo: value}),
			});


			/**
			 * Outline Gap
			 * 
			 */

			const outlineGapProps = ({
				label : __("Outline Gap (PC)", "still-be-combine-social-photos"),
				value : attributes.outlineGap,
				units : [
					{ value: 'em',  label: 'em',  default: 0.5 },
					{ value: 'rem', label: 'rem', default: 0.4 },
					{ value: 'px',  label: 'px',  default: 8   },
					{ value: 'vw',  label: 'vw',  default: 1   },
				],
				onChange : value => setAttributes({outlineGap: value}),
			});

			const outlineGapTabletProps = ({
				label : __("Outline Gap (Tablet)", "still-be-combine-social-photos"),
				value : attributes.outlineGapTablet,
				units : [
					{ value: 'em',  label: 'em',  default: 0.5 },
					{ value: 'rem', label: 'rem', default: 0.4 },
					{ value: 'px',  label: 'px',  default: 8   },
					{ value: 'vw',  label: 'vw',  default: 1   },
				],
				onChange : value => setAttributes({outlineGapTablet: value}),
			});

			const outlineGapSpProps = ({
				label : __("Outline Gap (SP)", "still-be-combine-social-photos"),
				value : attributes.outlineGapSp,
				units : [
					{ value: 'em',  label: 'em',  default: 0.5 },
					{ value: 'rem', label: 'rem', default: 0.4 },
					{ value: 'px',  label: 'px',  default: 8   },
					{ value: 'vw',  label: 'vw',  default: 1   },
				],
				onChange : value => setAttributes({outlineGapSp: value}),
			});


			/**
			 * Media Count
			 */

			const mediaCountProps = ({
				label : __("Media Count", "still-be-combine-social-photos"),
				value : attributes.mediaCount,
				min   : 5,
				max   : 100,
				initialPosition : 10,
				onChange : value => setAttributes({mediaCount: parseInt(value, 10)}),
			});


			/**
			 * Loading Effect
			 * 
			 */

			const loadingEffectProps = ({
				label    : __("Loading Effect", "still-be-combine-social-photos"),
				selected : attributes.loadingEffect,
				options  : [
					{ label: __("None",       "still-be-combine-social-photos"), value: "none"      },
					{ label: __("Fade-in",    "still-be-combine-social-photos"), value: "fadein"    },
					{ label: __("Fade-in Up", "still-be-combine-social-photos"), value: "fadein-up" },
				],
				onChange : value => setAttributes({loadingEffect: value}),
			});


			/**
			 * Max Column Width
			 */

			const columnWidthMaxProps = ({
				label : __("Max Column Width", "still-be-combine-social-photos"),
				value : attributes.columnWidthMax,
				min   : 100,
				max   : 900,
				initialPosition : 360,
				onChange : value => setAttributes({columnWidthMax: parseInt(value, 10)}),
			});


			/**
			 * Gap
			 */

			const gapProps = ({
				label : __("Gap for PC", "still-be-combine-social-photos"),
				value : attributes.gap,
				units : [
					{ value: 'em',  label: 'em',  default: 0.5 },
					{ value: 'rem', label: 'rem', default: 0.4 },
					{ value: 'px',  label: 'px',  default: 8   },
					{ value: 'vw',  label: 'vw',  default: 1   },
				],
				onChange : value => setAttributes({gap: value}),
			});

			const gapTabletProps = ({
				label : __("Gap for Tablet", "still-be-combine-social-photos"),
				value : attributes.gapTablet,
				units : [
					{ value: 'em',  label: 'em',  default: 0.5 },
					{ value: 'rem', label: 'rem', default: 0.4 },
					{ value: 'px',  label: 'px',  default: 8   },
					{ value: 'vw',  label: 'vw',  default: 1   },
				],
				onChange : value => setAttributes({gapTablet: value}),
			});

			const gapSpProps = ({
				label : __("Gap for SP", "still-be-combine-social-photos"),
				value : attributes.gapSp,
				units : [
					{ value: 'em',  label: 'em',  default: 0.5 },
					{ value: 'rem', label: 'rem', default: 0.4 },
					{ value: 'px',  label: 'px',  default: 8   },
					{ value: 'vw',  label: 'vw',  default: 1   },
				],
				onChange : value => setAttributes({gapSp: value}),
			});


			/**
			 * Shadow Outline
			 * 
			 */

			const hasOutlineShadowProps = ({
				label    : __("Show Ouline Shadow", "still-be-combine-social-photos"),
				checked  : attributes.hasOutlineShadow,
				onChange : value => setAttributes({hasOutlineShadow: Boolean(value)}),
			});


			/**
			 * Link Target
			 * 
			 */

			const linkTargetProps = ({
				label    : __("Link Target", "still-be-combine-social-photos"),
				selected : attributes.linkTarget,
				options  : [
					{ label: __("Open in the Same Tab",   "still-be-combine-social-photos"), value: "_self"             },
					{ label: __("Open in a New Tab",      "still-be-combine-social-photos"), value: "_blank"            },
					{ label: __("Open in a Modal Window", "still-be-combine-social-photos"), value: "stillbe-modal-win" },
				],
				onChange : value => setAttributes({linkTarget: value}),
			});


			/**
			 * Caption
			 * 
			 */

			const captionProps = ({
				label    : __("Show Caption", "still-be-combine-social-photos"),
				disabled : attributes.className === "is-style-simple",
				checked  : attributes.isShowCaption,
				onChange : value => setAttributes({isShowCaption: Boolean(value)}),
			});

			const captionHeightMaxProps = ({
				label : __("Caption Max Height", "still-be-combine-social-photos"),
				value : attributes.captionHeightMax,
				units : [
					{ value: 'em',  label: 'em',  default: 64   },
					{ value: 'rem', label: 'rem', default: 64   },
					{ value: 'px',  label: 'px',  default: 1024 },
					{ value: 'vw',  label: 'vw',  default: 1    },
				],
				onChange : value => setAttributes({captionHeightMax: value}),
			});


			/**
			 * Author
			 * 
			 */

			const authorProps = ({
				label   : __("Show Author", "still-be-combine-social-photos"),
				checked : attributes.isShowAuthor,
				onChange : value => setAttributes({isShowAuthor: Boolean(value)}),
			});


			/**
			 * Post Time
			 * 
			 */

			const timeProps = ({
				label   : __("Show Post Time", "still-be-combine-social-photos"),
				checked : attributes.isShowTime,
				onChange : value => setAttributes({isShowTime: Boolean(value)}),
			});


			/**
			 * Header
			 * 
			 */

			const headerProps = ({
				label   : __("Show Header", "still-be-combine-social-photos"),
				disabled: attributes.className === "is-style-simple",
				checked : attributes.isShowHeader,
				onChange : value => setAttributes({isShowHeader: Boolean(value)}),
			});

			const headerPositionProps = ({
				label    : __("Position", "still-be-combine-social-photos"),
				disabled : attributes.className === "is-style-simple" || !attributes.isShowHeader,
				selected : attributes.headerPosition,
				options  : [
					{ label: __("Left",   "still-be-combine-social-photos"), value: "left"   },
					{ label: __("Center", "still-be-combine-social-photos"), value: "center" },
					{ label: __("Right",  "still-be-combine-social-photos"), value: "right"  },
				],
				onChange : value => setAttributes({headerPosition: value}),
			});


			/**
			 * Footer
			 * 
			 */

			const footerProps = ({
				label   : __("Show Footer", "still-be-combine-social-photos"),
				disabled: attributes.className === "is-style-simple",
				checked : attributes.isShowFooter,
				onChange : value => setAttributes({isShowFooter: Boolean(value)}),
			});

			const footerPositionProps = ({
				label    : __("Position", "still-be-combine-social-photos"),
				disabled : attributes.className === "is-style-simple" || !attributes.isShowFooter,
				selected : attributes.footerPosition,
				options  : [
					{ label: __("Left",   "still-be-combine-social-photos"), value: "left"   },
					{ label: __("Center", "still-be-combine-social-photos"), value: "center" },
					{ label: __("Right",  "still-be-combine-social-photos"), value: "right"  },
				],
				onChange : value => setAttributes({footerPosition: value}),
			});


			/**
			 * Follow & Followers
			 * 
			 */

			const followsProps = ({
				label   : __("Show Follows Count", "still-be-combine-social-photos"),
				disabled: apiType !== "Graph API",
				checked : attributes.isShowFollows,
				onChange : value => setAttributes({isShowFollows: Boolean(value)}),
			});

			const followersProps = ({
				label   : __("Show Followers Count", "still-be-combine-social-photos"),
				disabled: apiType !== "Graph API",
				checked : attributes.isShowFollowers,
				onChange : value => setAttributes({isShowFollowers: Boolean(value)}),
			});


			/**
			 * Impressions
			 * 
			 */

			const impressionsProps = ({
				label   : __("Show Impressions", "still-be-combine-social-photos"),
				disabled: apiType !== "Graph API",
				checked : attributes.isShowImpressions,
				onChange : value => setAttributes({isShowImpressions: Boolean(value)}),
			});


			/**
			 * Hover Effect
			 * 
			 */

			const hoverEffectBlurProps = ({
				label    : __("Frosted Glass Effect", "still-be-combine-social-photos"),
			//	disabled : attributes.infoPosition !== "inner" || !(attributes.isShowAuthor || attributes.isShowTime || attributes.isShowCaption || attributes.isShowImpressions),
				checked  : attributes.hoverEffectBlur,
				onChange : value => setAttributes({hoverEffectBlur: Boolean(value)}),
			});

			const hoverEffectTiltProps = ({
				label    : __("Tilt Effect", "still-be-combine-social-photos"),
			//	disabled : attributes.infoPosition !== "inner" || !(attributes.isShowAuthor || attributes.isShowTime || attributes.isShowCaption || attributes.isShowImpressions),
				checked  : attributes.hoverEffectTilt,
				onChange : value => setAttributes({hoverEffectTilt: Boolean(value)}),
			});

			const hoverOverlayColorProps = ({
				label    : __("Overlay Color", "still-be-combine-social-photos"),
			//	disabled : attributes.infoPosition !== "inner" || !(attributes.isShowAuthor || attributes.isShowTime || attributes.isShowCaption || attributes.isShowImpressions),
				selected : attributes.hoverOverlayColor,
				options  : [
					{ label: __("Dark",  "still-be-combine-social-photos"), value: "dark"  },
					{ label: __("Light", "still-be-combine-social-photos"), value: "light" },
					{ label: __("None",  "still-be-combine-social-photos"), value: "none"  },
				],
				onChange : value => setAttributes({hoverOverlayColor: value}),
			});


			/**
			 * Wrapper Elements
			 * 
			 */

			const wrapperProps = useBlockProps({
				className: "sb-csp-masonry-grid-wrapper editor",
			});

			const initialWrapperProps = useBlockProps({
				className: "sb-csp-masonry-grid-init-wrapper",
			});

			const noteProps = ({
				className: "sb-csp-masonry-grid-note",
			});

			const hiddenProps = useBlockProps({
				className: "display-none",
			});


			/**
			 * Output Editor Elements
			 * 
			 */

			return createElement(
				Fragment,
				useBlockProps(),
				// Side Panel
				createElement(
					InspectorControls,
					useBlockProps(),
					createElement(
						PanelBody,
						{ title: __("Instagram User", "still-be-combine-social-photos") },
						createElement(
							SelectControl,
							usersProps
						),
						createElement(
							Button,
							authUserProps
						)
					),
					apiType === "Graph API" && createElement(
						PanelBody,
						{ title: __("Advanced Getting Posts", "still-be-combine-social-photos") },
						createElement(
							RadioControl,
							gettingTypeProps
						),
						attributes.gettingType === "business_discovery" && createElement(
							TextControl,
							businessDicoveryProps
						),
						( attributes.gettingType === "hashtag_recent" || attributes.gettingType === "hashtag_top" ) && createElement(
							TextControl,
							hashtagProps
						),
						( attributes.gettingType === "hashtag_recent" || attributes.gettingType === "hashtag_top" ) && createElement(
							Button,
							convertHashtagProps
						),
						( attributes.gettingType === "hashtag_recent" || attributes.gettingType === "hashtag_top" ) && createElement(
							"p",
							noteProps,
							__("Please click the 'Start Convertion' button when you set or change the hashtag as there is a limit to the number of times it can be converted.", "still-be-combine-social-photos")
						),
						createElement(
							TextControl,
							hashtagIdProps
						)
					),
					createElement(
						PanelBody,
						{ title: __("Video Option", "still-be-combine-social-photos") },
						createElement(
							RadioControl,
							displayingVideoProps
						),
						createElement(
							"p",
							noteProps,
							__("Video thumbnails cannot be used for posts other than your own due to Instagram specifications.", "still-be-combine-social-photos") +
							__("Therefore, you may consider changing the option if you want to display other user's posts or posts with hashtag.", "still-be-combine-social-photos")
						),
					),	
					createElement(
						PanelBody,
						{ title: __("Outline Gap", "still-be-combine-social-photos") },
						createElement(
							PanelRow,
							{},
							createElement(
								UnitControl,
								outlineGapProps
							)
						),
						createElement(
							PanelRow,
							{},
							createElement(
								UnitControl,
								outlineGapTabletProps
							)
						),
						createElement(
							PanelRow,
							{},
							createElement(
								UnitControl,
								outlineGapSpProps
							)
						)
					),
					createElement(
						PanelBody,
						{ title: __("Media Count", "still-be-combine-social-photos") },
						createElement(
							PanelRow,
							{},
							createElement(
								RangeControl,
								mediaCountProps
							)
						)
					),
					createElement(
						PanelBody,
						{ title: __("Loading Effect", "still-be-combine-social-photos") },
						createElement(
							PanelRow,
							{},
							createElement(
								RadioControl,
								loadingEffectProps
							)
						)
					),
					createElement(
						PanelBody,
						{ title: __("Max Column Width", "still-be-combine-social-photos") },
						createElement(
							PanelRow,
							{},
							createElement(
								RangeControl,
								columnWidthMaxProps
							)
						)
					),
					createElement(
						PanelBody,
						{ title: __("Gap", "still-be-combine-social-photos") },
						createElement(
							PanelRow,
							{},
							createElement(
								UnitControl,
								gapProps
							)
						),
						createElement(
							PanelRow,
							{},
							createElement(
								UnitControl,
								gapTabletProps
							)
						),
						createElement(
							PanelRow,
							{},
							createElement(
								UnitControl,
								gapSpProps
							)
						)
					),
					createElement(
						PanelBody,
						{ title: __("Show Outline Shadow", "still-be-combine-social-photos") },
						createElement(
							PanelRow,
							{},
							createElement(
								ToggleControl,
								hasOutlineShadowProps
							)
						)
					),
					createElement(
						PanelBody,
						{ title: __("Instagram Post Where to Open", "still-be-combine-social-photos") },
						createElement(
							PanelRow,
							{},
							createElement(
								RadioControl,
								linkTargetProps
							)
						)
					),
					createElement(
						PanelBody,
						{ title: __("Post Caption", "still-be-combine-social-photos") },
						attributes.className === "is-style-simple" && createElement(
							"p",
							noteProps,
							__("Not available when the block style is 'simple'.", "still-be-combine-social-photos")
						),
						createElement(
							PanelRow,
							{},
							createElement(
								ToggleControl,
								captionProps
							)
						),
						createElement(
							PanelRow,
							{},
							createElement(
								UnitControl,
								captionHeightMaxProps
							)
						)
					),
					createElement(
						PanelBody,
						{ title: __("Author & Post Time", "still-be-combine-social-photos") },
						createElement(
							PanelRow,
							{},
							createElement(
								ToggleControl,
								authorProps
							)
						),
						createElement(
							PanelRow,
							{},
							createElement(
								ToggleControl,
								timeProps
							)
						)
					),
					createElement(
						PanelBody,
						{ title: __("Header", "still-be-combine-social-photos") },
						attributes.className === "is-style-simple" && createElement(
							"p",
							noteProps,
							__("Not available when the block style is 'simple'.", "still-be-combine-social-photos")
						),
						createElement(
							PanelRow,
							{},
							createElement(
								ToggleControl,
								headerProps
							)
						),
						createElement(
							PanelRow,
							{},
							createElement(
								RadioControl,
								headerPositionProps
							)
						)
					),
					createElement(
						PanelBody,
						{ title: __("Footer", "still-be-combine-social-photos") },
						attributes.className === "is-style-simple" && createElement(
							"p",
							noteProps,
							__("Not available when the block style is 'simple'.", "still-be-combine-social-photos")
						),
						createElement(
							PanelRow,
							{},
							createElement(
								ToggleControl,
								footerProps
							)
						),
						createElement(
							PanelRow,
							{},
							createElement(
								RadioControl,
								footerPositionProps
							)
						)
					),
					createElement(
						PanelBody,
						{ title: __("Show Additional Informations", "still-be-combine-social-photos") },
						apiType !== "Graph API" && createElement(
							"p",
							noteProps,
							__("Additional informations are available in only Instagram Graph API.", "still-be-combine-social-photos")
						),
						...([ followsProps, followersProps, impressionsProps ].map( $elemProps => {
							return createElement(
								PanelRow,
								{},
								createElement(
									ToggleControl,
									$elemProps
								)
							);
						}))
					),
					createElement(
						PanelBody,
						{ title: __("Hover Effect", "still-be-combine-social-photos") },
						createElement(
							PanelRow,
							{},
							createElement(
								ToggleControl,
								hoverEffectBlurProps
							)
						),
						createElement(
							PanelRow,
							{},
							createElement(
								ToggleControl,
								hoverEffectTiltProps
							)
						)
					)
				),
				// Preview
				createElement(
					"div", wrapperProps,
					[
						...( attributes.id ? [
							createElement(
								wp.serverSideRender, {
									block      : "combine-social-photos/masonry-grid",
									attributes : attributes,
								}
							)
						] : [
							createElement(
								"div",
								initialWrapperProps,
								[
									createElement(
										SelectControl,
										usersProps
									),
									createElement(
										Button,
										authUserProps
									)
								]
							)
						] ),
						attributes.id && attributes.linkTarget === "stillbe-modal-win" && createElement(
							"div",
							{ className: "sb-csp-modal-cta" },
							[
								createElement( "b", {}, __("CTA in a Modal Window", "still-be-combine-social-photos") ),
								createElement( "p", {}, [
									__("You can set what you want to display in the modal window.", "still-be-combine-social-photos"),
									__("It is placed below the caption.", "still-be-combine-social-photos"),
								] ),
								createElement( InnerBlocks ),
							]
						)
					]
				)
			);

		},

		save: ( { attributes } ) => {

			if(attributes.linkTarget === "stillbe-modal-win"){
				return createElement("aside", { className: "sb-csp-modal-cta" }, createElement(InnerBlocks.Content));
			}

			return "<!-- combine-social-photos/masonry-grid -->";

		},

	});


	/**
	 *  Set Masonry Grids
	 * 
	 *   @param  Selector of the Masonry Layout Containers
	 *   @return void
	 */
	let delayForSetMasonryGrids = 2500;
	const setMasonryGrids = function($containerSelector){

		const setMasonryLayout = window.__stillbe?.layout?.masonry;

		if(!setMasonryLayout){
			console.error("Masonry Layout is not found....");
			return;
		}

		setTimeout(() => {
			document.querySelectorAll($containerSelector).forEach($feedList => {
				setMasonryLayout($feedList, true);
				delayForSetMasonryGrids = 0;
			});
		}, delayForSetMasonryGrids);

	};


	const sliders = [];


	// Global for Editor
	window.__stillbe                      = window.__stillbe || {};
	window.__stillbe.func                 = window.__stillbe.func || {};
	window.__stillbe.func.setMasonryGrids = setMasonryGrids.bind(null, ".sb-csp-ig-masonry-grid .ig-feed-list");


	if(/complete|loaded|interactive/.test(document.readyState)){
		// readyState = interactive is just before 'DOMContentLoaded' event
		window.__stillbe.func.setMasonryGrids();
	} else{
		window.addEventListener("DOMContentLoaded", window.__stillbe.func.setMasonryGrids, false);
	}


})(window.wp);
