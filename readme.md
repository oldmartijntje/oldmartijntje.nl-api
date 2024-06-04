
[db view](https://cloud.mongodb.com/v2/65ba17aac2ef1d2cd403a88e#/metrics/replicaSet/665eca6eac678c008c855eda/explorer/oldmartijntjeDB/users/find)


## connections
- **/login**
For logging in using your username and password
```json
{
    "username": "admin", // the users username - required
    "password": "globglogabgalab" // the users password  - required
}
```

- **/login/validateToken**
For checking if your sessiontoke is valid + logging in.
```json
{
    "sessionToken": "6601823a3dec43c813135975" // the sessiontoken - required
}
```

## mongodump

### **Mongo commando's**
Backup maken: 
```
mongodump --out ./src/assets/mongodump --db <nameOfDatabase> --gzip
```
Backup terugzetten: 
```
mongorestore --db ./src/assets/mongodump --drop <backupFolderName> --gzip
```