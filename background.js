chrome.runtime.onMessage.addListener(
    function (request, sender, sendResponse) {
        //Fetch redgifs page to grab properly capitalized video id
        fetch(`https://www.redgifs.com/watch/${request.gifid}`)
            .then(response => response.text())
            .then(responseText => sendResponse({ response: responseText }))
        return true; // Will respond asynchronously.
    }
);