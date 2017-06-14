# Redis generators

[![Build Status](https://travis-ci.org/jehy/redis-generators.svg?branch=master)](https://travis-ci.org/jehy/redis-generators)

Generator and subscribers via redis test task.

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