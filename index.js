/* eslint-disable no-console*/
/* eslint-disable no-underscore-dangle*/
const Redis           = require('ioredis'),
      RedisLock       = require('ioredis-lock'),
      Promise         = require('bluebird'),
      colors          = require('colors'),
      uuidV4          = require('uuid/v4'),
      messageInterval = 20,
      lockInterval    = messageInterval + 100,
      enableLogging   = true,
      workers         = 5,
      showErrors      = false;

let messageCount = 0;
function myLog(guid, message, level) {
  if (enableLogging) {
    if (level === 'warn') {
      console.log(colors.green(`${guid} : ${message}`));
    } else if (level === 'warn') {
      console.log(colors.red(`${guid} : ${message}`));
    } else {
      console.log(`${guid} : ${message}`);
    }
  }
}

function getRandomArbitrary(min, max) {
  return Math.floor(Math.random() * (max - min) + min);
}

function beGenerator(client, lock, myGuid) {
  messageCount++;
  const errorGeneration = getRandomArbitrary(1, 100);
  myLog(myGuid, 'publishing message');
  let message = messageCount;
  if (errorGeneration < 6) {
    message = `${messageCount}: ERROR: ${message}`;
    myLog(myGuid, 'message will be an error');
  }
  return lock.extend(lockInterval)
    .then(()=> {
      return client.publish('data', message);
    })
    .then(()=> {
      if (message === 66) {
        // emulate blackout. It would be better to release lock but we are emulating emergency, so...
        myLog(myGuid, 'emulating generator blackout', 'warn');
        return Promise.resolve();
      }
      return Promise
        .delay(messageInterval)
        .then(()=>beGenerator(client, lock, myGuid));
    })
    .catch(RedisLock.LockExtendError, ()=> {
      return Promise.delay(messageInterval);
    });
}


function beSubscriber(client, lockSubscriber, instanceGuid) {
  const subscribeClient = new Redis({keyPrefix: 'OneTwoTripTest:'});
  return lockSubscriber.acquire('app:feature:lock:subscriber')
    .then(()=>subscribeClient.subscribe('data'))
    .then(()=> {
      myLog(instanceGuid, 'I am a subscriber now!', 'warn');
      return new Promise((resolve)=> {
        subscribeClient.on('message', (channel, message) => {
          lockSubscriber.extend(lockInterval)
            .then(()=> {
              myLog(instanceGuid, `Received message ${message} from channel ${channel}`);
              let action = Promise.resolve();
              if (message.indexOf('ERROR') !== -1) {
                action = client.lpush('errors', message);
              }
              if (getRandomArbitrary(1, 100) < 4) {
                myLog(instanceGuid, 'emulating subscriber blackout', true);
                action.then(()=> {
                  subscribeClient.disconnect();
                  resolve();
                });
              }
            })
            .catch(RedisLock.LockExtendError, ()=> {
              subscribeClient.disconnect();
              Promise
                .delay(messageInterval)
                .then(()=>resolve());
            });
        });
      });
    })
    .catch(RedisLock.LockAcquisitionError, (err)=> {
      myLog(instanceGuid, 'Failed to get subscriber lock');
      return Promise.delay(messageInterval);
    });
}

function startInstance(client, lockSubscriber, lockGenerator, instanceGuid) {
  // try being a subscriber
  return client.pubsub('NUMSUB', 'data')
    .then((data)=> {
      const subscribers = data[1];
      // myLog(instanceGuid, `subscribers: ${data.toString()}`);
      if (subscribers === 0) {
        return beSubscriber(client, lockSubscriber, instanceGuid);
      }
      // try being a generator
      return lockGenerator.acquire('app:feature:lock:generator')
        .then(()=> {
          myLog(instanceGuid, 'I am a generator now!', 'warn');
          return beGenerator(client, lockGenerator, instanceGuid);
        })
        .catch(RedisLock.LockAcquisitionError, ()=> {
          return Promise.delay(messageInterval);
        });
    });
}

function run() {
  const instanceGuid = uuidV4();
  myLog(instanceGuid, 'starting');
  const client = new Redis({keyPrefix: 'OneTwoTripTest:'});

  function startFailover() {
    const lockGenerator = RedisLock.createLock(client, {
      timeout: lockInterval,
      retries: 3,
      delay: messageInterval,
    });
    const lockSubscriber = RedisLock.createLock(client, {
      timeout: lockInterval,
      retries: 3,
      delay: messageInterval,
    });
    startInstance(client, lockSubscriber, lockGenerator, instanceGuid)
      .then(()=> {
        myLog(instanceGuid, 'Instance stopped, long live the instance!', 'warn');
        startFailover();
      })
      .catch((err)=> {
        myLog(instanceGuid, `Instance errored, restarting instance!' ${err.toString()}`, 'error');
        startFailover();
      });
  }

  startFailover();
}


if (showErrors) {
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
} else {
  for (let i = 0; i < workers; i++) {
    run();
  }
}
