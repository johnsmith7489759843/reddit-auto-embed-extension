//Global list of all embedded video ids and elements
var embededVideoElements = {};

//Watch for user scroll to unpause and unmute videos
document.addEventListener('scroll', function () {
    //Loop through tracked videos
    for (const key in embededVideoElements) {
        //Grab video element
        const currentVideoElement = document.getElementById(key);
        //Check if its in the viewport
        if(isInViewport(currentVideoElement)) {
            if(currentVideoElement.getAttribute('user-paused')) {
                console.log(currentVideoElement.getAttribute('user-paused'));
                if(currentVideoElement.getAttribute('user-paused') === "false") {
                    console.log("unpausing")
                    currentVideoElement.play();
                    currentVideoElement.muted = false;
                }
            } else {
                currentVideoElement.play();
                currentVideoElement.muted = false;
            }
        } else {
            currentVideoElement.pause();
            currentVideoElement.muted = true;
        }
    }
});


//Function to track elements in and out of viewports
function isInViewport(el) {
    const rect = el.getBoundingClientRect();
    return (
        rect.top >= 1 && //Changed to 1 to discard display:none elements
        rect.left >= 1 && //Changed to 1 to discard display:none elements
        rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
        rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
}

//Function to embed redgif videos
async function plantRedGifEmbed(parentArticle, hrefText) {
    //Grab id for video
    const gifId = hrefText.split("/watch/")[1];
    var capitalizedIdLink = undefined;
    //Send message to background to pull page
    chrome.runtime.sendMessage({gifid: gifId}, function(response) {
        //Parse response and find og:video meta tag
        var newElement = document.createElement('html');
        newElement.innerHTML = response.response;
        const metaTags = newElement.getElementsByTagName('meta');
        for(var tag in metaTags) {
            const ogVideoAttr = metaTags[tag].getAttribute('property');
            if(ogVideoAttr && ogVideoAttr === "og:video") {
                //Grab properly capitalized link
                capitalizedIdLink = metaTags[tag].getAttribute("content");
                break;
            }
        }
        //Check for found and defined link
        if(capitalizedIdLink) {
            //String manipulation to create video src
            const separateDomain = capitalizedIdLink.split("https://thumbs2.redgifs.com/");
            const separateExtension = separateDomain[1].split(".");
            const finalId = separateExtension[0] + "-mobile.mp4";
            const finalLink = "https://thumbs2.redgifs.com/" + finalId;
            //Append embeded video
            parentArticle.insertAdjacentHTML('afterend', `<video id="${gifId}" src="${finalLink}" rel="noopener nofollow ugc" playsinline="true" loop  muted controls preload="auto" tags="" class="video" style="height:500px; width:100%; z-index: 999;"><source src="${finalLink}" type="video/mp4"></video>`);
            //Grab new video element and add to list
            const newVideo = document.querySelector(`#${gifId}`);
            embededVideoElements[gifId] = newVideo;
            document.getElementById(`${gifId}`).addEventListener("click", function (e) {
                e = window.event || e;
                e.stopPropagation();
                if(this.paused) {
                    this.setAttribute('user-paused', false);
                } else {
                    this.setAttribute('user-paused', true);
                }
            })
        }
    });
    
}


//Function to embed imgur videos
function plantImgurGifEmbed(parentArticle, hrefText) {
    //Grab video id and create embed link
    const separateDomain = hrefText.split(".com/");
    const separateFileExtension = separateDomain[1].split(".");
    embedId = separateFileExtension[0];
    //Append embeded video with proper src
    parentArticle.insertAdjacentHTML('afterend', `<video id="imgur-${embedId}" class="post" poster="//i.imgur.com/${embedId}.jpg" preload="auto" autoplay="autoplay" muted="muted" loop="loop" webkit-playsinline="" controls="" style="width: 100%; height: auto;"><source src="//i.imgur.com/${embedId}.mp4" type="video/mp4"></video>`);
    //Grab new element and add to video list
    const newVideo = document.querySelector(`#imgur-${embedId}`);
    embededVideoElements[`imgur-${embedId}`] = newVideo;
}

//Function to embed videos
function embedVideos(contextNode = document) {
    //Grab all new divs under the contextNode that contain the class post and haven't
    //been processed already
    const redditPostLinks = document.evaluate(
        `//div[contains(@class,"Post") and not(@rae-processed)]`,
        contextNode,
        null,
        XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE,
        null
    );
    
    //Loop through all new post divs
    for (let i = 0; i < redditPostLinks.snapshotLength; i++) {
        let results = [];
        //Set post as processed
        redditPostLinks.snapshotItem(i).setAttribute("rae-processed", true);
        //Grab all links under the new post
        const postHeaderEval = document.evaluate(
            `.//*[self::a and not(@rae-processed)]`,
            redditPostLinks.snapshotItem(i),
            null,
            XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE,
            null
        );
        //Loop through and set processed and append to results
        for (let i = 0, length = postHeaderEval.snapshotLength; i < length; ++i) {
            postHeaderEval.snapshotItem(i).setAttribute("rae-processed", true);
            results.push(postHeaderEval.snapshotItem(i));
        }
        //Loop through all links and append appropriate video
        results.forEach((element, i) => {
            //get link href and classes
            const hrefText = element.getAttribute("href");
            const noClass = element.getAttribute("class");
            //Check for redgif or imgur link
            if (hrefText && (hrefText.includes("redgif") || hrefText.includes("imgur"))) {
                //Grab top level article that holds the post internals
                const parentArticle = element.closest('article');
                //Embed redgif video
                if (parentArticle && hrefText.includes("redgif") && !parentArticle.getAttribute('rae-processed')) {
                    plantRedGifEmbed(parentArticle, hrefText);
                    parentArticle.setAttribute('rae-processed', true);
                }
                //Embed imgur video
                if (parentArticle && hrefText.includes("imgur") && !parentArticle.getAttribute('rae-processed')) {
                    plantImgurGifEmbed(parentArticle, hrefText);
                    parentArticle.setAttribute('rae-processed', true);
                }
            }
        })
    }
}

//Observer to watch for any newly appended articles to the dom
let observer = new MutationObserver(function (mutations) {
    mutations.forEach(mutation => {
        const targetNodeName = mutation.target.nodeName;
        if (targetNodeName === "ARTICLE" || targetNodeName === "article") {
            for (const addedNode of mutation.addedNodes) {
                embedVideos(addedNode);
            }
        }
    })
}).observe(document, { childList: true, subtree: true, attributes: false });