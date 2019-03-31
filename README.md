# test-task-backend
Rest api for simple file manager
Manage files from directory, defined in cofnig file

Support routes

GET files
 - return list of all files from directory
 
GET files/:fileName
 - return text files and images
 - return 400 if file type not supported
 
POST files
 - upload files to directory
 - retrun array of new files
 
DELETE files/:fileName
 - remove file from directory
