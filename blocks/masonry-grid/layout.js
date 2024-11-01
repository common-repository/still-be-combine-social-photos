(function(){

	"use strict";

	const masonryLayout = function($feedList, $forceRun = false){

		if(!$feedList) return;

		const IG_FEED_CLASSNAME        = "ig-feed";
		const CARD_WRAPPER_CLASSNAME   = "ig-post-wrapper";
		const IG_MEDIA_IMG_CLASSNAME   = "ig-post-img";
		const COLUMN_WRAPPER_CLASSNAME = "sb-csp-masonry-column-wrapper";

		const gridGap  = window.getComputedStyle($feedList).gap.split(" ").map(parseFloat);
		const feeds    = $feedList.getElementsByClassName(IG_FEED_CLASSNAME);

		const columnWrappers = $feedList.getElementsByClassName(COLUMN_WRAPPER_CLASSNAME);

		if(feeds.length < 1) return;

		const duration = ($durationString => {
			const durationString = $durationString.trim();
			const parsedValue    = parseFloat(durationString, 10);
			const unit           = durationString.replace(/\D*\d*\.?\d*\s*(m?s).*?/i, "$1").toLowerCase();
			return unit === "ms" ? parsedValue : ~~(parsedValue / 1000);
		})(window.getComputedStyle($feedList).getPropertyValue("--sb-csp-loading-duration"));

		const timerIds  = [];
		let   cardIndex = 0;

		const initMasonryLayout = () => {
			if(feeds.length < 1) return;
			// Initialize (Clear)
			timerIds.forEach(clearTimeout);
			timerIds.length = 0;
			interesectionObserver.disconnect();
			Array.prototype.forEach.call(feeds, $feed => {
				$feed.style.position   = "";
				$feed.classList.remove("show");
			});
			cardIndex = 0;
			while(columnWrappers[0]){
				columnWrappers[0].remove();
			}
			// Initial Settings
			const columns = ~~($feedList.clientWidth / feeds[0].clientWidth + 0.1);
			$feedList.style.position = "relative";
			for(let i = 0, n = feeds.length; i < n; ++i){
				if(i < columns){
					const columnWrapper     = $feedList.insertBefore(document.createElement("div"), feeds[i]);
					columnWrapper.className = COLUMN_WRAPPER_CLASSNAME;
					cardIndex = i;
					columnWrappers[i].appendChild(feeds[i]);
					interesectionObserver.observe(feeds[i]);
				} else{
					feeds[i].style.position = "absolute";
					feeds[i].style.zIndex   = "-1";
				}
			}
		};

		const fadeinUpRun = async ($feed, $delay) => {
			// Adjust Aspect Ratio
			const media = $feed.querySelector(`.${IG_MEDIA_IMG_CLASSNAME}`);
			media.style.aspectRatio = (media.naturalWidth || media.videoWidth) + " / " + (media.naturalHeight || media.videoHeight);
			// Fadein & Set a Next Element Position
			timerIds.push(setTimeout(() => {
				// Show a Current Feed
				$feed.style.position = "";
				$feed.style.zIndex   = "";
				$feed.classList.add("show");
				setTimeout(() => {
					$feed.style.transition = "0s";
				}, duration);
				if(feeds.length <= ++cardIndex){
					return;
				}
				// Set a Next Feed
				const nextFeed = feeds[cardIndex];
				interesectionObserver.observe(nextFeed);
				// Min-height Column Wrapper
				const addingColumn = Array.prototype.reduce.call(columnWrappers, ($acc, $curr) => {
					const accHeight  = $acc?.clientHeight || document.body.scrollHeight;
					const currHeight = $curr.clientHeight;
					return accHeight < currHeight ? $acc : $curr;
				}, null);
				// Add a Next Feed to Min-height Wrapper
				addingColumn.appendChild(nextFeed);
			}, $delay));
		};

		const interesectionObserverOptions = {
			root       : null,
			rootMargin : `0px 0px ${duration < 10 ? "10%" : "-25%"}`,
			threshold  : 0,
		};
		const interesectionObserverCallback = ($entries, $observer) => {
			let delay = 0;
			$entries.forEach($entry => {
				if(!$entry.isIntersecting) return;
				const card = $entry.target;
				$observer.unobserve(card);
				const media     = card.querySelector(`.${IG_MEDIA_IMG_CLASSNAME}`);
				const delayTime = (duration / 2) * (Math.random() + ++delay);
				if(media.naturalHeight || media.videoHeight){
					fadeinUpRun(card, delayTime);
				} else{
					const dummyMedia  = document.createElement(media.tagName);
					dummyMedia.onload = fadeinUpRun.bind(null, card, delayTime);
					dummyMedia.src    = media.src;
				}
			});
		};
		const interesectionObserver = new IntersectionObserver(interesectionObserverCallback, interesectionObserverOptions);

		const resizeObserverCallback = ($entries, $observer) => {
			$entries.forEach($entry => {
				if($entry.target.dataset.prevWidth == $entry.target.clientWidth){
					return;
				}
				$entry.target.dataset.prevWidth = $entry.target.clientWidth;
				initMasonryLayout();
			});
		};
		const resizeObserver = new ResizeObserver(resizeObserverCallback);
		$feedList.dataset.prevWidth = $feedList.clientWidth;
		resizeObserver.observe($feedList);

		window.addEventListener("load", initMasonryLayout, false);

		let resizeTimerId = 0;
		let previousWidth = document.documentElement.clientWidth || window.innerWidth || document.body.clientWidth;
		window.addEventListener("resize", () => {
			if(resizeTimerId) return;
			resizeTimerId = setTimeout(() => {
				resizeTimerId = 0;
				const currentWidth = document.documentElement.clientWidth || window.innerWidth || document.body.clientWidth;
				if(previousWidth !== currentWidth){
					previousWidth = currentWidth;
					initMasonryLayout();
				}
			}, 250);
		}, false);

		if($forceRun){
			initMasonryLayout();
		}

	};


	// Global for Editor
	window.__stillbe                = window.__stillbe || {};
	window.__stillbe.layout         = window.__stillbe.layout || {};
	window.__stillbe.layout.masonry = window.__stillbe.layout.masonry || masonryLayout;

})();
