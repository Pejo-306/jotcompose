const http = require('http');

const options = {
    hostname: 'localhost',
    port: process.env.PORT || 3000,
    path: '/health',
    method: 'GET',
    timeout: 2000
};

const req = http.request(options, (res) => {
    if (res.statusCode === 200) {
        console.log('Healthcheck passed!');
        process.exit(0);
    } else {
        console.error(`Healthcheck failed with status code ${res.statusCode}`);
        process.exit(1);
    }
});

req.on('error', () => {
    console.error('Healthcheck failed (unknown error)');
    process.exit(1);
});

req.on('timeout', () => {
    console.error('Healthcheck timed out');
    req.destroy();
    process.exit(1);
});

req.end();
