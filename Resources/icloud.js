// Recursive function to disable iCloud for a folder hierarchy
exports.disableBackupForFolder = function(folderName) { 
    function walk(folder) {
        var dir = Ti.Filesystem.getFile(folder);
        var dir_files = dir.getDirectoryListing();
        for (var l = 0; l < dir_files.length; l++) {
            var file = Ti.Filesystem.getFile(folder, dir_files[l]);
            file.setRemoteBackup(false);
            var nativePath = file.nativePath;
            if (nativePath.lastIndexOf('/') == nativePath.length - 1) {
                walk(file.nativePath);
            }
        }
    }
    walk(folderName);
};