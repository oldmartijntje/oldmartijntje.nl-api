const endpoints = [
    {
        name: 'isOnline',
        url: 'https://api.oldmartijntje.nl/test/isOnline',
        type: 'GET',
        header: 'Random',
    },
    {
        name: 'visits',
        url: 'https://api.oldmartijntje.nl/test/visits',
        type: 'GET',
        header: 'Random',
    },
    {
        name: 'Login Endpoint',
        url: 'https://api.oldmartijntje.nl/login/',
        type: 'POST',
        header: 'Authorization',
    },
    {
        name: 'Validate SessionToken',
        url: 'https://api.oldmartijntje.nl/login/validateToken',
        type: 'POST',
        header: 'Authorization',
    },
];

const apiList = document.getElementById('api-list');

function addEndpoint(name, url, type, header) {
    const headerElement = document.getElementById(header);

    if (headerElement) {
        const headerElementList = document.getElementById(`${header}-list`);
        // Header already exists, append to it
        const listItem = document.createElement('li');
        listItem.innerHTML = `<span><b>${type}</b> - </span><span><b>${name}</b>: </span><a href="${url}">${url}</a>`;
        headerElementList.appendChild(listItem);
    } else {
        // Create a new header and list
        const headerElement = document.createElement('div');
        const headerHeaderElement = document.createElement('h2');
        headerElement.id = header;
        headerHeaderElement.textContent = header;
        apiList.appendChild(headerElement);
        headerElement.appendChild(headerHeaderElement);

        const list = document.createElement('ul');
        list.id = `${header}-list`;
        headerElement.appendChild(list);

        const listItem = document.createElement('li');
        listItem.innerHTML = `<span><b>${type}</b> - </span><span><b>${name}</b>: </span><a href="${url}">${url}</a>`;
        list.appendChild(listItem);
    }
}

for (const endpoint of endpoints) {
    addEndpoint(endpoint.name, endpoint.url, endpoint.type, endpoint.header);
}
