const endpoints = [
    {
        name: 'create displayItem',
        url: 'https://api.oldmartijntje.nl/getData/displayItems',
        type: 'POST',
        header: 'admin',
        hoverText: 'This endpoint is used to create a new displayItem.',
    },
    {
        name: 'delete displayItem',
        url: 'https://api.oldmartijntje.nl/getData/displayItems',
        type: 'DELETE',
        header: 'admin',
        hoverText: 'This endpoint is used to delete a displayItem.',
    },
    {
        name: 'update displayItem',
        url: 'https://api.oldmartijntje.nl/getData/displayItems',
        type: 'PUT',
        header: 'admin',
        hoverText: 'This endpoint is used to update a displayItem.',
    },
    {
        name: 'get displayItems',
        url: 'https://api.oldmartijntje.nl/getData/getDisplayItems',
        type: 'POST',
        header: 'GetData',
        hoverText: 'This endpoint is used to get all my displayItems.',
    },
    {
        name: 'isOnline',
        url: 'https://api.oldmartijntje.nl/test/isOnline',
        type: 'GET',
        header: 'Random',
        hoverText: 'This endpoint is used to check if the server is online.',
    },
    {
        name: 'visits',
        url: 'https://api.oldmartijntje.nl/test/visits',
        type: 'GET',
        header: 'Random',
        hoverText: 'This endpoint is used to check how many times the server has been visited.',
    },
    {
        name: 'Login Endpoint',
        url: 'https://api.oldmartijntje.nl/login/',
        type: 'POST',
        header: 'Authorization',
        hoverText: 'This endpoint is used to login to the server. It requires a username and password.',
    },
    {
        name: 'Validate SessionToken',
        url: 'https://api.oldmartijntje.nl/login/validateToken',
        type: 'POST',
        header: 'Authorization',
        hoverText: 'This endpoint is used to check if a session token is still valid. Does require a username and sessiontoken.',
    },
    {
        name: 'Refresh SessionToken',
        url: 'https://api.oldmartijntje.nl/login/refreshToken',
        type: 'POST',
        header: 'Authorization',
        hoverText: 'This endpoint is used to get a new sessiontoken with an old one.',
    },
    {
        name: 'Register Account',
        url: 'https://api.oldmartijntje.nl/register',
        type: 'POST',
        header: 'Authorization',
        hoverText: 'This endpoint is used to create an account with a registration code.',
    },
    {
        name: 'Generate Register Code',
        url: 'https://api.oldmartijntje.nl/register/generate',
        type: 'POST',
        header: 'admin',
        hoverText: 'This endpoint is used to create a registration code.',
    },
    {
        name: 'Find Register Code',
        url: 'https://api.oldmartijntje.nl/register/find',
        type: 'POST',
        header: 'admin',
        hoverText: 'This endpoint is used to find all usable registration codes.',
    },
    {
        name: 'Delete Register Code',
        url: 'https://api.oldmartijntje.nl/register/delete',
        type: 'POST',
        header: 'admin',
        hoverText: 'This endpoint is used to delete a registration code.',
    },
    {
        name: 'Get project data',
        url: 'https://api.oldmartijntje.nl/projectData/getProjectData',
        type: 'POST',
        header: 'admin',
        hoverText: 'This endpoint is used to get all the data from a specific project.',
    },
];

const tabInfo = {
    "user": "these endpoints require the user to be logged in. And currently I am the only one with an account.",
    "admin": "these endpoints require the logged in user to have admin privilages / a high clearance level.",
    "Random": "This is just for testing purposes and should not be used in production.",
    "GetData": "These are used to get up-to-date json data from the server.",
    "Authorization": "These endpoints are for authorization purposes. This can be for actual accounts or <a href=''>single use tokens</a>."
}

const apiList = document.getElementById('api-list');

function addEndpoint(name, url, type, header, hoverText) {
    const headerElement = document.getElementById(header);

    if (headerElement) {
        const headerElementList = document.getElementById(`${header}-list`);
        // Header already exists, append to it
        const listItem = document.createElement('li');
        listItem.innerHTML = `<span><b>${type}</b> - </span><span><b>${name}</b>: </span><a href="${url}">${url}</a><b style="cursor:pointer" class="icon" title="${hoverText}" onclick="alert('${hoverText}')">ⓘ</b>`;

        headerElementList.appendChild(listItem);
    } else {
        // Create a new header and list
        const headerElement = document.createElement('div');
        const headerInfoElement = document.createElement('div');
        const headerHeaderElement = document.createElement('h2');
        headerElement.id = header;
        headerHeaderElement.textContent = header;
        apiList.appendChild(headerElement);
        headerElement.appendChild(headerHeaderElement);

        headerInfoElement.id = `${header}-info`;
        headerElement.appendChild(headerInfoElement);

        const list = document.createElement('ul');
        list.id = `${header}-list`;
        headerElement.appendChild(list);

        const listItem = document.createElement('li');
        listItem.innerHTML = `<span><b>${type}</b> - </span><span><b>${name}</b>: </span><a href="${url}">${url}</a><b style="cursor:pointer" class="icon" title="${hoverText}" onclick="alert('${hoverText}')">ⓘ</b>`;
        list.appendChild(listItem);
    }
}

for (const endpoint of endpoints) {
    addEndpoint(endpoint.name, endpoint.url, endpoint.type, endpoint.header, endpoint.hoverText);
}

for (const header in tabInfo) {
    const headerElement = document.getElementById(`${header}-info`);
    if (headerElement) {
        const headerInfoElement = document.createElement('p');
        headerInfoElement.innerHTML = tabInfo[header];
        headerElement.appendChild(headerInfoElement);
    }
}
