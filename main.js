const uuidv4 = require('uuid/v4');
const SLACK_FILE_BASE_URL = 'https://files.slack.com/files-pri'

addEventListener('fetch', event => {
    event.respondWith(handleRequest(event.request))
})

/**
 * This worker allows access to files shared in public channels of a different namespace
 * @param {Request} request
 */
async function handleRequest(request) {
    const requestURL = new URL(request.url);
    // URL.pathname begins with '/', so the part of the path that determines the namespace 
    const path = requestURL.pathname.split('/');
    let slackToken
    let namespaceID
    switch (path[1]) {
        case 'student':
            slackToken = await SLACK_COMMON.get("studentAuthToken");
            namespaceID = await SLACK_COMMON.get("studentNamespaceID");
            break;
        case 'organization':
            slackToken = await SLACK_COMMON.get("orgAuthToken");
            namespaceID = await SLACK_COMMON.get("orgNamespaceID")
            break;
        default:
            const err = `Cannot decide which namespace to look for file for${requestURL}`;
            const resp = await respNotFound(err);
            return resp
    }
    const fileURL = path.slice(2, path.length).join('/');
    const fetchFileResp = await fetchSlackFile(fileURL, slackToken, namespaceID);
    if (fetchFileResp.status != 200) {
        const err = `File for ${requestURL} no found`;
        const resp = await respNotFound(err)
        return resp
    }
    return fetchFileResp
}


/**
 * Each file uploaded to slack has a private url. We can find it files.info API
 * see https://api.slack.com/methods/files.info
 * The base URL is https://files.slack.com/files-pri
 * @param {*} filePath 
 * @param {*} peerNamespaceToken 
 */
function fetchSlackFile(filePath, token, namespaceID) {
    const url = `${SLACK_FILE_BASE_URL}/${namespaceID}-${filePath}`;
    return fetch(url, {
        "headers": {
            "Authorization": `Bearer ${token}`
        }
    }).then(resp => {
        return resp
    });
}

async function sentryLog(err) {
    const currentTimestamp = Date.now() / 1000;
    const body = sentryEventJson(err, currentTimestamp)
    const sentryProectID = await SLACK_COMMON.get("sentryProjectID");
    const sentryKey = await SLACK_COMMON.get("sentryKey");
    return await fetch(`https://sentry.io/api/${sentryProectID}/store/`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Sentry-Auth': [
                'Sentry sentry_version=7',
                `sentry_timestamp=${currentTimestamp}`,
                `sentry_client=slack-file-share/0`,
                `sentry_key=${sentryKey}`
            ].join(', '),
        },
        body,
    });
}

function sentryEventJson(err, currentTimestamp) {
    return JSON.stringify({
        event_id: uuidv4(),
        message: JSON.stringify(err),
        timestamp: currentTimestamp,
        logger: "slack-file-share-logger",
        platform: "javascript",
    })
}


async function respNotFound(err) {
    await sentryLog(err);
    return new Response(err, {
        status: 404,
        statusText: "Not Found",
        headers: { 'Content-Type': 'text/plain' },
    })
}