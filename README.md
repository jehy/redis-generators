# Redis generators

[![Build Status](https://travis-ci.org/jehy/redis-generators.svg?branch=master)](https://travis-ci.org/jehy/redis-generators)

Test task.

# The task
You neeed to make an application which works with redis and can both generate messages and process them. Any number of applications should be able to run in parallel.

Any data exchange should be implemeted via redis only.

All applications but generator should be subscribers and should be ready to get message from redis.

All messages should be processed once via one of the subscribers.
Only one of applications (any one) should be able to become a generator.

If current generator died unexpectedly, one of applications should become a generator. You can't use any OS resources to define generator - those should only communicate via redis. Messages shoud be generated every 400ms.

You can use any random text as a message. 5% of messages should contain an error. If a current messages does, it should be put into redis.

If you launch application with `getErrors` parameter, it should fetch all error messages from redis, output them, delete them and finish.

You should check that application can preprocess 1.000.000 messages (500 ms interval is unnecccessary for the test).

## Notes

I used node cluster for this task - it was not neccessary but it is more fun, fully
 utilizes your CPUs and shows that application can run on separate servers.

Generators and subscribers should both fail sometimes so I added blackout at random.

I am not sure that count subscribers is optimal (we can just use locks) but checking
alive subscribers like that seems more lightweight. Need more investigation.

## Options
Change them directly in `index.js`:

* `workers` number of workers for one node. workers*cpu should not be less then 2!
* `maxMessageCount` number of messages we need to generate and process;
* `messageInterval` how often we need to generate messages;
* `enableLogging` to log or not to log. This is the question.

## Usage

* `npm start` or `npm test` to test that we can process all messages
* `npm run errors` to display errors and clear them
