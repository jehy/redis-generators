/* eslint-disable no-console*/
const Redis           = require('ioredis');

const client = new Redis({keyPrefix: 'OneTwoTripTest:'});
console.log('Fetching errors...');
client.llen('errors')
  .then((num)=> {
    console.log(`Number of errors: ${num}`);
    return client.lrange('errors', 0, num);
  })
  .then((data)=> {
    for (let i = 0; i < data.length; i++) {
      console.log(data[i]);
    }
  })
  .delay(2000)// wait for console output
  .then(()=> {
    console.log('deleting errors database...');
    return client.del('errors');
  })
  .then(()=> {
    process.exit(0);
  });

