const endpoints = [
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
        hoverText: 'This endpoint is used to check if a session token is still valid.',
    },
];

const tabInfo = {
    "user": "these endpoints require the user to be logged in. And currently I am the only one with an account.",
    "admin": "these endpoints require the logged in user to have admin privilages.",
    "Random": "This is just for testing purposes and should not be used in production.",
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
