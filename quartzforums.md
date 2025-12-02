quartzforums is the system for implementing a forum that I am making. And yes it's going to be implemented a sa quartz plugin.

# desciption
quartzforums is a forum which can be called via api calls. You create an account. Then you get an account key. (you can reset your account key)
with this account key, you are able to post to a forum. You can do that by writing to an existing forum, or creating a new one.
you can also use the api to view someones account, and see in which forums they were active.
a user should be able to remove their comments, the attatched user will be set to null. (to stop information loss)
there is also a way to look at all recent updated forums.

# specifics
quartzforums will need quite a few endpoints

**access key** is the key that a user has to be able to post
**implementation key** is a key that the host website has, that means that we can identify on which website the forum is hosted. for example:
> `lkjajadfaf` is the key that leads to `docs.oldmartijntje.nl`, then all forums with this key, when clicked (if our api is implemented correctly), will send you to `docs.oldmartijntje.nl`.

## writing a contribution
you will need to send your `access key`, and the `implementation key`, and your post contents (a sting) and the `subpage`, for example: `/cool-forum`.
if the `implementation key` doesn't exist in the db, or is disabled, block it.

## creating an account
this consists of an username and password.

## loggin into an account
this consists of an username and password.

## deleting a contibution
this uses the messageID of the message.

## disabling your account
this will delete your account and set all your messages their owner to null.

## resetting your access token
it will remove your old access token, and set a new one.

## viewing a forum
this gets all messages fo that forum by `implementation key` + `subpage` (this combi is the KEY / ID of the forum. meaning that if a path moves, (and the api is implemented correctly) the old messages will not be accessed.) 

## a list of recently updated forums
gets all recently changed (like the 25 most latest changed items) by name, impementation key and subpage.

## all forums
get all forums by name, impementation key and subpage. (filterable)

# database format

## implementation key

- implementation key
- disabled: false 

## quartzforumAccount

- name
- id (mongodb)
- profile-design: {} // functionality for this will be added some day, just place an empty array.
- lastUsage // a date object that gets updated with each api call, whether via login or via `access key`
- password // bcrypt
- limbo: false // messages added by people in limbo can only be seen by people in limbo. this will be set to true if a user posts a message with the word "fuck" in it. (just for demonstration so that i can do things with this later on.)

## quartzforumForum

- implementation key
- subpage
- id // mongodb
- lastPush // date that changes when someone adds a message.
- (loads all messages with the id in the query)

## quartzforumMessage

- id of the senders account // mongodb
- id of the forum // mongodb
- message id // mongodb
- content: the text that was posted
- limbo: false // all messages posted by someone in limbo

