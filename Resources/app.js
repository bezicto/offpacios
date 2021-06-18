/*
offpacdb.sqlite configuration:
CREATE VIRTUAL TABLE vbooks USING FTS3(CONTROL_NO VARCHAR, SMD VARCHAR, ITEM_CAT VARCHAR, ISBN_ISSN VARCHAR, CALL_NO VARCHAR, PUBLICATION_INFO VARCHAR, TITLE VARCHAR)
*/












//Ti.include('customsg.js');
showMessageTimeout = function(customMessage,interval){
        indWin = Titanium.UI.createWindow();
        var indView = Titanium.UI.createView({bottom:50,height:50,width:200,borderRadius:10,backgroundColor:'#aaa',opacity:1.0}); 
        indWin.add(indView); 
        var message = Titanium.UI.createLabel({
            text: customMessage && typeof(customMessage!=='undefined') ? customMessage : L('please_wait'),
            color:'#fff',width:'auto',height:'auto',textAlign:'center',
            font:{fontFamily:'Helvetica Neue', fontSize:12,fontWeight:'bold'}});
 
        indView.add(message);
        indWin.open();
 
        interval = interval ? interval : 1500;
        setTimeout(function(){
            indWin.close({opacity:0,duration:250});
        },interval);
    };

showMessageNoTimeout = function(customMessage,cause){
        if (cause == "open")
        {
	        indWin = Titanium.UI.createWindow();
	        var indView = Titanium.UI.createView({bottom:50,height:50,width:200,borderRadius:10,backgroundColor:'#aaa',opacity:1.0});	 
	        indWin.add(indView);
	        var message = Titanium.UI.createLabel({
	            text: customMessage && typeof(customMessage!=='undefined') ? customMessage : L('please_wait'),
	            color:'#fff',width:'auto',height:'auto',textAlign:'center',
	            font:{fontFamily:'Helvetica Neue', fontSize:12,fontWeight:'bold'}});
	 
	        indView.add(message);
	        indWin.open();
        }
        else if (cause == "close")
        {
        	indWin.close();
        }
    };












//----------------------------------------------------------------------------------------------------------------
//Ti.include('update.js');
var initIndicator = Ti.Filesystem.getFile(Ti.Filesystem.applicationDataDirectory,'init.txt');
if (initIndicator.exists()==false) {
	alert('This will begin the initial database download process. Internet connection is required. Please allow it to finish.');
}

var db;
var oldVersion;

function readLocalVersion()
	{
		var readContents;
		var myFile = Titanium.Filesystem.getFile(Titanium.Filesystem.applicationDataDirectory,'version.txt');       
 		if (myFile.exists()) 
		{
 			readContents = myFile.read();		
			return readContents.text;
		}
		else
			return '20151201';
	}
	
oldVersion = readLocalVersion();

var xhr = Titanium.Network.createHTTPClient({
	onload: function() {
		var f = Ti.Filesystem.getFile(Ti.Filesystem.applicationDataDirectory,'version.txt');//read version.txt on the source code
		if (f.exists())
			{f.deleteFile();}
		f.write(this.responseData);
		Ti.App.fireEvent('version_downloaded', {filepath:f.nativePath});
	},
	timeout: 10000
});
xhr.open('GET','http://pustaka2.upsi.edu.my/offpacdwl/latest.txt');//download version num from the specified url
xhr.send();

Ti.App.addEventListener('version_downloaded', function(e) {
	var trueIndicator = Ti.Filesystem.getFile(Ti.Filesystem.applicationDataDirectory,'true.txt');
	var file1;
	var file2;
	
	if ((parseInt(readLocalVersion()) != parseInt(oldVersion)) || trueIndicator.exists() == false)
	{
		if(trueIndicator.exists()==true) 
		{trueIndicator.deleteFile();}
		
		showMessageNoTimeout("Updating database, do not close. Requires internet connection. Progress at title bar.","open");
		
		var xhrDB = Titanium.Network.createHTTPClient({
			onload: function() 
			{								
				db = Ti.Database.install("offpacdb.sqlite", "offpacdb");
		        var file = db.getFile();
		        db.close();
		        file.write(this.responseData);
		        db = Ti.Database.install("offpacdb.sqlite", "offpacdb");
		        db.file.setRemoteBackup(false);//for disable icloud backup on the installed database
		        db.close();
				Ti.App.fireEvent('db_downloaded', {filepath:file.nativePath});
			},
			timeout: 10000
		});		
		xhrDB.open('GET','http://pustaka2.upsi.edu.my/offpacdwl/offpacdb.sqlite');//download and install new database from the specified url
		xhrDB.send();	
			
		xhrDB.ondatastream = function(e) {
			win.setTitle("Updating "+ Math.round(e.progress*100) +"%");
		};			
		Ti.App.addEventListener('db_downloaded', function(e) {
			win.setTitle("OffPAC: "+readLocalVersion());
			showMessageNoTimeout("","close");
			var alertDialog = Ti.UI.createAlertDialog({
			    message: 'The database has been updated.',
			    ok: 'OK',
			    title: 'Database Updater'
			  });
			alertDialog.show();
			file1 = "true";
			if (file1 == "true" && file2 == "true")//if files downloaded successfully
			{
				var trueIndicator = Ti.Filesystem.getFile(Ti.Filesystem.applicationDataDirectory,'true.txt');
				if (trueIndicator.exists()==false) {
					trueIndicator.write('TRUE');
				}
				//create init.txt to show the success of downloading the db file for the first time
				var initIndicator = Ti.Filesystem.getFile(Ti.Filesystem.applicationDataDirectory,'init.txt');
				if (initIndicator.exists()==false) {
					initIndicator.write('TRUE');
				}
			}
		});
				
		var xhr2 = Titanium.Network.createHTTPClient({
			onload: function() {
				var f = Ti.Filesystem.getFile(Ti.Filesystem.applicationDataDirectory,'offpaclevel.txt');//download and install new shelf index
				if (f.exists())
					f.deleteFile();
				f.write(this.responseData);
				Ti.App.fireEvent('level_downloaded', {filepath:f.nativePath});
			},
			timeout: 10000
		});
		xhr2.open('GET','http://pustaka2.upsi.edu.my/offpacdwl/offpaclevel.txt');//download book shelves locater information
		xhr2.send();
		Ti.App.addEventListener('level_downloaded', function(e) {
			file2 = "true";
		});
	}
	else
	{
		db = Ti.Database.install("offpacdb.sqlite", "offpacdb");
	}
});












//----------------------------------------------------------------------------------------------------------------
//Ti.include('bookmark.js');
function listBookMark()
{
	var db = Ti.Database.open('offpacdb');
	var book = [];	
	var bookShelf = [];	
	var arrayReadBookMark = readBookmark().toString().split("\n");
	var htmlReadBookMark = '';
	for(i in arrayReadBookMark) 
	{	
    	if (arrayReadBookMark[i] != '')
    	{
    		var checkBookRS = db.execute("SELECT CONTROL_NO,TITLE,PUBLICATION_INFO,CALL_NO,ISBN_ISSN,SMD,ITEM_CAT FROM vbooks WHERE CALL_NO MATCH '"+arrayReadBookMark[i]+"' LIMIT 1");	
  				var bControlNo = checkBookRS.fieldByName('CONTROL_NO');
  				var bTitle = toTitleCase(checkBookRS.fieldByName('TITLE'));
  				var bPublish = checkBookRS.fieldByName('PUBLICATION_INFO');
  				var bCallNo = checkBookRS.fieldByName('CALL_NO');
  				var bISBN_ISSN = checkBookRS.fieldByName('ISBN_ISSN');
  				var bSMD = checkBookRS.fieldByName('SMD');  		
  				var bITEM_CAT = checkBookRS.fieldByName('ITEM_CAT');
  			checkBookRS.close();  			
  			
  			if (bISBN_ISSN == '' || bISBN_ISSN == null || bISBN_ISSN == 'null') bISBN_ISSN = 'N/A';
  			if (bSMD == '' || bSMD == null || bSMD == 'null') bSMD = 'N/A';
  			
  			var bookAlert = 'Title: '+bTitle+'\n\nPublication Info: '+bPublish+'\n\nCall Number: '+bCallNo+'\n\nISBN/ISSN: '+bISBN_ISSN+'\n\nCategory:\n'+bITEM_CAT;
  			
  			universalMarkText = '\n'+bTitle+'\n'+arrayReadBookMark[i]+'\n';
  			
  			book[i] = Ti.UI.createLabel({
  				text:universalMarkText,
  				bookAlert:bookAlert,
  				bTitle:bTitle,
  				bControlNo:bControlNo,
  				bITEM_CAT:bITEM_CAT,
  				bCallNo:bCallNo,
  				bSMD:bSMD,
  				bISBN_ISSN:bISBN_ISSN,
  				color:'white',left:0});  		
  			bookShelf[i] = Ti.UI.createView({width: Ti.UI.FILL,height: '10dp',layout:'vertical'});
  			book[i].addEventListener('click',function(e) 
  			{
  				var universaltextDisplay = '\n'+checkShelf(e.source.bSMD,e.source.bITEM_CAT,e.source.bCallNo);
				var bookAlert = e.source.bookAlert+'\n'+universaltextDisplay;
  				
  				var dialogI = Ti.UI.createAlertDialog({
  					buttonNames: ['I Want To..','Remove','Close'],
	   				message: bookAlert,
	   				bTitle:e.source.bTitle,
	   				bControlNo:e.source.bControlNo,
	   				bCallNo:e.source.bCallNo,
	   				bISBN_ISSN:e.source.bISBN_ISSN,
	   				title: 'More info'});
	   			dialogI.addEventListener('click', function(e){
					if (e.index == 0) 
					{
						var opts = {
								  	options: ['Books On Wheels', 'Status','Cancel'],
								  	cancel: 2,
								  	bTitle:e.source.bTitle,
								  	bControlNo:e.source.bControlNo,
			   						bCallNo:e.source.bCallNo,
			   						bISBN_ISSN:e.source.bISBN_ISSN,
								  	title: 'Select Action'
								};
								var dialog2i = Ti.UI.createOptionDialog(opts);
								dialog2i.addEventListener('click', function(e) {
									var selectedIndex = e.index;
								    if (selectedIndex == 0)
								    	{						                    
						                    //open google form and prepopulate the field with all values above
											Ti.Platform.openURL('https://docs.google.com/forms/d/e/1FAIpQLSceJGAYFc_qK3u6lAZvNqE-h2wj_75SYe50v_2u_HB0XKKUXA/viewform?usp=pp_url&entry.1286276726=&entry.1183882089=&entry.481763119=&entry.1949356321=&entry.253584895='+e.source.bTitle+'&entry.628182060='+e.source.bCallNo+'&entry.702207976');
								    	}
								    else if (selectedIndex == 1)
								    	{
						                      //open a dialog box and look for the item directly on the OPAC system
											  dialog2.open({
										        url: 'http://pustaka.upsi.edu.my:8081/webopac/Search/Results?lookfor='+e.source.bISBN_ISSN+'&type=ISN',
										        title: 'VuFind Integrator',
										        tintColor: 'grey'
										    });	
								    	}
								});
								dialog2i.show();
					}
					else if (e.index == 1) {drawer.toggleLeftWindow();removeBookMark(e.source.bCallNo);}
				});
	   			dialogI.show();
  			});
  			insideleftMenuView.add(book[i]); 
  			insideleftMenuView.add(bookShelf[i]);
  		}		
	}
	db.close();
}

function onNavDrawerWinOpen(evt) {
    this.removeEventListener('open', onNavDrawerWinOpen);
    if(this.getActivity()) {
        // need to explicitly use getXYZ methods
        var actionBar = this.getActivity().getActionBar();

        if (actionBar) {
            // Now we can do stuff to the actionbar  
            actionBar.setTitle('OffPAC: '+readLocalVersion());
            
            // show an angle bracket next to the home icon,
            // indicating to users that the home icon is tappable
            actionBar.setDisplayHomeAsUp(true);
           
            // toggle the left window when the home icon is selected
            actionBar.setOnHomeIconItemSelected(function() {
                drawer.toggleLeftWindow();
           });
        }
    }  
}


//layout
var leftMenuView = Ti.UI.createView({width: Ti.UI.FILL,height: Ti.UI.FILL,layout:'vertical',backgroundColor: '#003333'});
var leftBtn = Ti.UI.createButton({title:"≡"});
	leftBtn.addEventListener("click", function(){
			drawer.toggleLeftWindow();
		});	
var rightBtn = Ti.UI.createButton({title:"B"});
	rightBtn.addEventListener("click", function(){
			if (win.getBackgroundColor() == 'black')
				{
					win.setBackgroundColor('white');
					rightBtn.setTitle('W');
					rightBtn.setColor('white');
					labelStart.setColor('black');
					if (result.length != 0)
					{
						for (i=0;i<=result.length -1;i++)
						{
							result[i].setColor('black');
						}
					}
					resultColor = 'black';
				}
			else
				{
					win.setBackgroundColor('black');
					rightBtn.setTitle('B');
					rightBtn.setColor('black');
					labelStart.setColor('white');
					if (result.length != 0)
					{
						for (i=0;i<=result.length -1;i++)
						{
							result[i].setColor('white');							
						}
					}
					resultColor = 'white';
				}
		});
var win = Ti.UI.createWindow({
				width: Ti.UI.FILL,
				height: Ti.UI.FILL,
				layout: 'vertical',
				backgroundColor:'black',
				translucent:false,
				title:"OffPAC: "+readLocalVersion(),
				barColor:"#606060",
				navTintColor:"white",
				leftNavButton: leftBtn,
				rightNavButton: rightBtn,
				extendSafeArea: true
				});
				
function createCenterNavWindow(win){
		var navController =  Ti.UI.iOS.createNavigationWindow({
			window : win
		});
		return navController;	
}

// CREATE THE MODULE
var NappDrawerModule = require('dk.napp.drawer');
var drawer = NappDrawerModule.createDrawer({
	fullscreen:false, 
	leftWindow: leftMenuView,
	centerWindow: createCenterNavWindow(win),
	fading: 0.9, // 0-1
	parallaxAmount: 0.2, //0-1
	shadowWidth:"40dp", 
	leftDrawerWidth: "300dp",
	animationMode: NappDrawerModule.ANIMATION_NONE,
	closeDrawerGestureMode: NappDrawerModule.CLOSE_MODE_ALL,
	openDrawerGestureMode: NappDrawerModule.OPEN_MODE_ALL,
	orientationModes: [Ti.UI.PORTRAIT, Ti.UI.UPSIDE_PORTRAIT],
	statusBarStyle: NappDrawerModule.STATUSBAR_BLACK,
});

var insideleftMenuView = Ti.UI.createScrollView({
	width: Ti.UI.FILL,
	height: '75%',//default is 80%
	layout: 'vertical'
});		

drawer.addEventListener("windowDidOpen", function(e){
  	textField.blur();
  	var topLeftTitleText = Ti.UI.createLabel({text:'Bookmarks:',font:{fontSize:18},color:'white',height:'10%'});
	var leftMenuViewInside = Titanium.UI.createScrollView({
			width: Titanium.UI.FILL,
			layout: 'vertical',
			height:'15%',//default is 10%
			});
		var clearBMButton = Titanium.UI.createButton({title: 'Clear all', width:'100%'});
			clearBMButton.addEventListener('click',function(e)
			{
	   		 	clearBookmark();
	   		 	drawer.toggleLeftWindow();		  
			});					
	   var labelVersion = Ti.UI.createLabel({text:"\nOffPAC Version "+Titanium.App.version,color:'orange',font:{fontSize:10}});		
			
	leftMenuView.removeAllChildren();insideleftMenuView.removeAllChildren();//remove before adding new views		
	
	leftMenuView.add(topLeftTitleText);
	leftMenuView.add(insideleftMenuView);
	leftMenuView.add(leftMenuViewInside); 
	
	if (readBookmark() != '')
	{
		listBookMark();
		leftMenuViewInside.add(clearBMButton);		
	}	
	leftMenuViewInside.add(labelVersion);
	insideleftMenuView.scrollTo(0,0);
});

drawer.addEventListener('open', onNavDrawerWinOpen);
drawer.addEventListener("windowDidClose", function(e){
	leftMenuView.removeAllChildren();insideleftMenuView.removeAllChildren();
	});

// lets open it
drawer.open();














//----------------------------------------------------------------------------------------------------------------
//Ti.include('scandit.js');
function convertISBN(form)
{
	// Set default variables and cleanup ISBN
	var form = form.replace(/[-\s]/g,"").toUpperCase();
	var isbnnum = form;
	var isbn10exp = /^\d{9}[0-9X]$/;
	var isbn13exp = /^\d{13}$/;
	var isbnlen = isbnnum.length;
	var total = 0;

   	if (!(isbn10exp.test(isbnnum)) && !(isbn13exp.test(isbnnum))) {
		if ((isbnlen != 10) && (isbnlen != 13)) {
 			alert("This ISBN is invalid." + "\n" +
		   	      "It contains " + isbnlen + " characters.");
		}
		else {
 			alert("This ISBN is invalid." + "\n" +
		   	      "It contains invalid characters.");			
		}
          	return false;
    	}

	// Validate & convert a 10-digit ISBN
	if (isbnlen == 10) {
		// Test for 10-digit ISBNs:
		// Formulated number must be divisible by 11
		// 0234567899 is a valid number
		for (var x=0; x<9; x++) { 
			total = total+(isbnnum.charAt(x)*(10-x)); 
		}

		// check digit
		z = isbnnum.charAt(9);
		if (z == "X") { z = 10; }

		// validate ISBN
		if ((total+z*1) % 11 != 0) {   // modulo function gives remainder
			z = (11 - (total % 11)) % 11;
			if (z == 10) { z = "X"; }
			alert("This 10-digit ISBN is invalid." + "\n" +
			      "The check digit should be " + z + ".");
			return false;
		}
		else {
			// convert the 10-digit ISBN to a 13-digit ISBN
			isbnnum = "978"+isbnnum.substring(0,9);
			total = 0;
			for (var x=0; x<12; x++) {
				if ((x % 2) == 0) { y = 1; }
				else { y = 3; }
				total = total+(isbnnum.charAt(x)*y);
			}		
			z = (10 - (total % 10)) % 10;
		}		
	}

	// Validate & convert a 13-digit ISBN
	else { 
		// Test for 13-digit ISBNs
		// 9780234567890 is a valid number
		for (var x=0; x<12; x++) {
			if ((x % 2) == 0) { y = 1; }
			else { y = 3; }
			total = total+(isbnnum.charAt(x)*y);
		}

		// check digit
		z = isbnnum.charAt(12);

		// validate ISBN		
		if ((10 - (total % 10)) % 10 != z) {   // modulo function gives remainder
			z = (10 - (total % 10)) % 10; 
			alert("This 13-digit ISBN is invalid." + "\n" +
			      "The check digit should be " + z + ".");
			return false;
		}
		else {
			// convert the 13-digit ISBN to a 10-digit ISBN
			if ((isbnnum.substring(0,3) != "978")) {
				alert("This 13-digit ISBN does not begin with \"978\"" + "\n" +
				      "It cannot be converted to a 10-digit ISBN.");
				return false;
			}
			else {
				isbnnum = isbnnum.substring(3,12);
				total = 0;
				for (var x=0; x<9; x++) {
					total = total+(isbnnum.charAt(x)*(10-x));
				}
				z = (11 - (total % 11)) % 11;
				if (z == 10) { z = "X"; } 
			}
		}
	}

	var convertedISBN = isbnnum+z; 
	return convertedISBN;

}

var scanditsdk = require("com.mirasense.scanditsdk");// load the Scandit SDK module

var picker;
var closeButton;
var scanISBNISSNtext;

var win4full = Titanium.UI.createWindow({  
        //title:'Powered by Scandit',
        navBarHidden:true,
        fullscreen:true
});// Create a window to add the picker to and display it. 

var closeButton = Titanium.UI.createButton({title: 'Close',bottom:'20'});
		closeButton.addEventListener('click',function(e)
		{
			closeScanner();
		});
var scanISBNISSNtext = Ti.UI.createLabel({text:'Scan ISBN/ISSN barcode',font:{fontSize:10},color:'white',bottom:'5'});

var openScanner = function() {
       	picker = scanditsdk.createView({
        width:"100%",
        height:"100%"
		});// Sets up the scanner and starts it in a new window.
   
	picker.init("4RR54Hj8EeOTug7hmcTpPvxw+t2u8AsF2TR+naxg61o", 0);// Initialize the barcode picker, app key here.
    
	picker.setSuccessCallback(function(e) {
        
        var strToCheck = e.barcode;
		var res = strToCheck.substring(4,0);
      	textField.value = e.barcode;
   		closeScanner();
   		buttonGo.fireEvent('click');
	});// Set callback functions for when scanning succeedes and for when the scanning is canceled.
    
	picker.setCancelCallback(function(e) {
        closeScanner();
	});
    
	win4full.add(picker);
	
	closeButton = Titanium.UI.createButton({title: 'Close',bottom:'15'});
					closeButton.addEventListener('click',function(e)
					{closeScanner();});
	scanISBNISSNtext = Ti.UI.createLabel({text:'Scan ISBN/ISSN barcode',font:{fontSize:10},color:'white',bottom:'5'});
	
	win4full.add(closeButton);
	win4full.add(scanISBNISSNtext);
    
	win4full.addEventListener('open', function(e) {
		picker.setOrientation(win4full.orientation);      
        picker.setSize(Ti.Platform.displayCaps.platformWidth,Ti.Platform.displayCaps.platformHeight);
        picker.startScanning();// startScanning() has to be called after the window is opened. 
	});
    
	win4full.open();
};// Instantiate the Scandit SDK Barcode Picker view

var closeScanner = function() {
    if (picker != null) {
        picker.stopScanning();        
        win4full.remove(closeButton);
		win4full.remove(scanISBNISSNtext);
		win4full.remove(picker);
    }
    win4full.close();
};// Stops the scanner, removes it from the window and closes the latter.













//----------------------------------------------------------------------------------------------------------------
//Ti.include('uiarrange.js');

//for disable icloud backup on Ti.Filesystem.applicationDataDirectory
var iCloud = require('icloud');
iCloud.disableBackupForFolder(Ti.Filesystem.applicationDataDirectory);

var dialog2 = require('ti.safaridialog');

var result = [];
var initial = 10;
var limit = 10;
var numbering = 0;
var totalRecordInfoFlag = true;
var controlNumPass3;
var resultColor='white';

function reserveItemURL(controlNumVar,accessNumVar)
{
	//pass material control number to reservation page
	return 'http://pustaka.upsi.edu.my/elmu/servlet/CatalogueFileServlet?materialNoList='+controlNumVar;
}

function saveBookmark(callnumber)
	{
		var myFile = Titanium.Filesystem.getFile(Titanium.Filesystem.applicationDataDirectory,'bookmark.txt');
	   	myFile.write(callnumber+'\n',true);
	}
	
function readBookmark()
	{
		var readContents;
		var myFile = Titanium.Filesystem.getFile(Titanium.Filesystem.applicationDataDirectory,'bookmark.txt');       
 		if (myFile.exists()) 
		{
 			readContents = myFile.read(); 		
			return readContents.text;
		}
		else
			return '';
	}

function clearBookmark()
{
	var myFile = Titanium.Filesystem.getFile(Titanium.Filesystem.applicationDataDirectory,'bookmark.txt');
    myFile.write('',false);
}

function removeBookMark(callNoToRemove)
{
	var arrayReadBookMark = readBookmark().toString().split("\n");
	clearBookmark();
	for(i in arrayReadBookMark) 
	{	
    	if (arrayReadBookMark[i] != callNoToRemove)
    	{
    		saveBookmark(arrayReadBookMark[i]);
    	}
   	}
}

function toTitleCase(str)
{
    return str.replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();});
}

function searchDB(searchText)
{
   var dba = Ti.Database.open('offpacdb');	
   buttonGo.setTitle('Searching...');
   buttonGo.touchEnabled = false;
   for (z=0;z<result.length;z++)
   {
   	resultCard.remove(result[z]);//clear the resultCard elements
   }
   resultCard.remove(navigationBar);
   
   if (searchText != '')
   {	
   		appendcheckRS = " AND (TITLE MATCH '"+searchText+"' OR ISBN_ISSN MATCH '"+searchText+"')";
   		
   		if (thesisSwitch.value == true)		
   			appendcheckRS = appendcheckRS + " AND ITEM_CAT LIKE 'Koleksi Tesis'";
   		if (mmSwitch.value == true)		
   			appendcheckRS = appendcheckRS + " AND ITEM_CAT LIKE 'Koleksi Sumber Media'";
   		
   		var firstLimit = initial - 10;
   		
   		var  checkRS = dba.execute('SELECT rowid,CONTROL_NO,TITLE,PUBLICATION_INFO,CALL_NO,ISBN_ISSN,SMD,ITEM_CAT FROM vbooks WHERE TITLE IS NOT NULL'+appendcheckRS+' LIMIT '+firstLimit+','+limit);
   																																							  
   		var  checkTotalRS = dba.execute('SELECT COUNT(*) AS jumlah FROM vbooks WHERE TITLE IS NOT NULL'+appendcheckRS);
   										
		var TotalRS = checkTotalRS.fieldByName('jumlah');
   			   		
   		i=0;
   		numbering = firstLimit + 1;
   		while (checkRS.isValidRow())
   		{  			
  			var crowid = checkRS.fieldByName('rowid');
  			var cTitle = toTitleCase(checkRS.fieldByName('TITLE'));
  			var cPublish = checkRS.fieldByName('PUBLICATION_INFO');
  			var cCallNo = checkRS.fieldByName('CALL_NO');
  			var cISBN_ISSN = checkRS.fieldByName('ISBN_ISSN');
  			var cSMD = checkRS.fieldByName('SMD');
  			var cITEM_CAT = checkRS.fieldByName('ITEM_CAT');
  			var cControlNo = checkRS.fieldByName('CONTROL_NO');
  			
  			if (cPublish == null)
  				var tcPublish = 'Publication Info N/A';
  			else
  				tcPublish = cPublish;
  			if (cCallNo == null)
  				var tcCallNo = 'Call Number N/A';
  			else
  				tcCallNo = cCallNo;
  				
  			universalText = numbering +'. '+cTitle+'\n'+tcPublish+'\n'+tcCallNo+'\n\n';
  			
  			if (cISBN_ISSN == '' || cISBN_ISSN == null || cISBN_ISSN == 'null') cISBN_ISSN = 'N/A';
  			if (cSMD == '' || cSMD == null || cSMD == 'null') cSMD = 'N/A';
  			 			
  			alertText = 'Title: '+cTitle+'\n\nPublication Info: '+cPublish+'\n\nCall Number: '+cCallNo+'\n\nISBN/ISSN: '+cISBN_ISSN+'\n\nCategory:\n'+cITEM_CAT;
  			 			 			
  			result[i] = Ti.UI.createLabel({
  				text:universalText,
  				width:'98%',
  				alertText:alertText, 
  				cTitle:cTitle,
  				cCallNo:cCallNo,
  				cSMD:cSMD,
  				cITEM_CAT:cITEM_CAT,
  				cISBN_ISSN:cISBN_ISSN,
  				cControlNo:cControlNo,
  				color:resultColor,left:0,font:{fontSize:14}});
  			result[i].addEventListener('click',function(e) {  				
  				var universaltextDisplay = '\n'+checkShelf(e.source.cSMD,e.source.cITEM_CAT,e.source.cCallNo);  			
  				var alertText = e.source.alertText+'\n'+universaltextDisplay;		
  				var dialog = Ti.UI.createAlertDialog(
  					{
  						buttonNames: ['I Want To..','Status','Close'],
	   					message: alertText,	   		
	   					cTitle:e.source.cTitle,			
	   					cControlNo:e.source.cControlNo,
	   					cCallNo:e.source.cCallNo,
	   					cISBN_ISSN:e.source.cISBN_ISSN,
	   					title: 'More info'});
	   			dialog.addEventListener('click', function(e){
					if (e.index == 1) 
					{
						//open webopac with a passing value of isbn for more detail online
						dialog2.open({
					        url: 'http://pustaka.upsi.edu.my:8081/webopac/Search/Results?lookfor='+e.source.cISBN_ISSN+'&type=ISN',
					        title: 'VuFind Integrator',
					        tintColor: 'grey'
					    });				
					} 
					if (e.index == 0) 
					{
						var opts = {
								  	options: ['Books On Wheels', 'Bookmark','Cancel'],
								  	cancel: 2,
								  	cTitle:e.source.cTitle,
								  	cControlNo:e.source.cControlNo,
			   						cCallNo:e.source.cCallNo,
			   						cISBN_ISSN:e.source.cISBN_ISSN,
								  	title: 'Select Action'
								};
								var dialog2i = Ti.UI.createOptionDialog(opts);
								dialog2i.addEventListener('click', function(e) {
									var selectedIndex = e.index;
								    if (selectedIndex == 0)
								    	{						                    
						                    //open google form and prepopulate the field with all values above
											Ti.Platform.openURL('https://docs.google.com/forms/d/e/1FAIpQLSceJGAYFc_qK3u6lAZvNqE-h2wj_75SYe50v_2u_HB0XKKUXA/viewform?usp=pp_url&entry.1286276726=&entry.1183882089=&entry.481763119=&entry.1949356321=&entry.253584895='+e.source.cTitle+'&entry.628182060='+e.source.cCallNo+'&entry.702207976');
								    	}
								    else if (selectedIndex == 1)
								    	{
						                      saveBookmark(e.source.cCallNo);
						                      Ti.API.info(readBookmark());
						                      showMessageTimeout(e.source.cCallNo+' bookmarked.',250);
								    	}
								});
								dialog2i.show();				
					}
				});
	   			dialog.show();
  				});
  			resultCard.add(result[i]);
  			checkRS.next();
  			i=i+1;
  			numbering = numbering +1;
		}	
		checkRS.close();
		
		if (TotalRS >= 1)
			{
				resultCard.add(navigationBar);
				if (initial == 10 && totalRecordInfoFlag == true)
				{
						showMessageTimeout(TotalRS+" record(s) found.\nTap on result for more info.",500);
				}				
			}
		else	
			{
				showMessageTimeout("No record(s) found.",500);				
			}
		
		if (initial == 10)
			Prev.enabled = false;
		else
			Prev.enabled = true;
		if (initial < TotalRS)
			Next.enabled = true;
		else
			Next.enabled = false;
	}
	else
		alert('Please insert a search term');
		
	buttonGo.setTitle('Search');
	buttonGo.touchEnabled = true;
	dba.close();
}

function checkShelf(smd,itemcat,callnumber)
{
	var wordList = [];// Array for word list
	var readFile = Titanium.Filesystem.getFile(Titanium.Filesystem.applicationDataDirectory, "offpaclevel.txt"); // read offpaclevel.txt
				 
	if (readFile.exists()){  		
		var text = readFile.read().text.split('\n');// Split the text file by line
				 
		// Add the words, by line, into the wordList array	
		for(var i=0;i<text.length;i++)
		{wordList[i] = text[i];}
	}
	// If the file doesn't exist print "no file found"
	else
	{Ti.API.info("no file found");}	
	
	if (itemcat == "Koleksi Terbuka")
	{
		var parts = callnumber.match(/[a-zA-Z]+|[0-9]+/g);//read call number into parts selected by user
	
		for (var i=0;i<wordList.length;i++)
		{
			//split the wordList into parts
			var wordListParts = wordList[i].split(/[ ]+/);;
			
			if (parts[0] === wordListParts[0])
			{
				if (wordListParts[1] === "*")
				{
					return "Level "+wordListParts[3]+" Shelf "+wordListParts[4];
					break;
				}
				else
				{
					if (parseFloat(parts[1])>=parseFloat(wordListParts[1]))	
						{
							if (parseFloat(parts[1])<=parseFloat(wordListParts[2]))
							{
								return "Level "+wordListParts[3]+" Shelf "+wordListParts[4]; 
								break;
							}
						}
				}				
			}
		}
	}
	else if (itemcat == "Koleksi Tesis")
		return "Level 2 Thesis Collection Room";
	else if (itemcat == "Kertas Persidangan/Prosiding")
		return "Level 1";
	else if (itemcat == "Courseware")
		return "Level 4 Media Sources Collection";
	else if (itemcat == "Digital Video Disc")
		return "Level 4 Media Sources Collection";
	else if (itemcat == "Kaset")
		return "Level 4 Media Sources Collection";
	else if (itemcat == "Peta")
		return "Level 4 Media Sources Collection";
	else if (itemcat == "Slaid")
		return "Level 4 Media Sources Collection";
	else if (itemcat == "Koleksi Pendidikan Malaysia")
		return "Level 2 Malaysia Education Collection";
	else
		{
			if (smd == "ACQUISITION PROGRESS")
				return "This item currently in acquisition process";
			else
				return "Refer to collection category";
		}
}


//layout -------------------------------------------------------------------------------------
   
var textFieldColor = 'black';

var labelStart = Ti.UI.createLabel({text:'Enter your search term:',top:10,color:'white',font:{fontSize:24}});
var textField = Ti.UI.createTextField({borderStyle: Ti.UI.INPUT_BORDERSTYLE_ROUNDED,color:textFieldColor,top: 10, width: "70%", height: 60});

var labelAll = Ti.UI.createLabel({text:'All',color:'orange',font:{fontSize:12}});
var allSwitch = Ti.UI.createSwitch({
  value:true 
});
	 allSwitch.addEventListener('change',function(e){
	 if (allSwitch.value == true)
	 {	
	 	thesisSwitch.value = false;
	 	mmSwitch.value = false;
	 }
	});
var labelThesis = Ti.UI.createLabel({text:' Thesis',color:'orange',font:{fontSize:12}});
var thesisSwitch = Ti.UI.createSwitch({
  value:false
});
	 thesisSwitch.addEventListener('change',function(e){
	 if (thesisSwitch.value == true)
	 {	
	 	allSwitch.value = false;
	 	mmSwitch.value = false;
	 }
	});
var labelMM = Ti.UI.createLabel({text:' Multimedia',color:'orange',font:{fontSize:12}});
var mmSwitch = Ti.UI.createSwitch({
  value:false
});
	mmSwitch.addEventListener('change',function(e){
	 if (mmSwitch.value == true)
	 {	
	 	allSwitch.value = false;
	 	thesisSwitch.value = false;
	 }
	});
var inputBar = Titanium.UI.createView({
	layout: 'horizontal',
	top:5,
	height:Ti.UI.SIZE,
	width:Ti.UI.SIZE,
});
inputBar.add(labelAll);
inputBar.add(allSwitch);
inputBar.add(labelThesis);
inputBar.add(thesisSwitch);
inputBar.add(labelMM);
inputBar.add(mmSwitch);

var searchBar = Titanium.UI.createView({
	layout: 'horizontal',
	height:60,
});
var buttonGo = Titanium.UI.createButton({title: 'Search', width: '49%', height: 60});
buttonGo.addEventListener('click',function(e)
{
   initial = 10;
   totalRecordInfoFlag = true;
   searchDB(textField.value);   
   textField.blur();
});

var scanGo = Titanium.UI.createButton({title: 'Scan', width: '49%', height: 60});
scanGo.addEventListener('click',function(e)
{
  openScanner();    
});

searchBar.add(buttonGo);
searchBar.add(scanGo);

var resultCard = Titanium.UI.createScrollView({
	width: '98%',
	layout: 'vertical',
	top:10,
});

var navigationBar = Titanium.UI.createView({
	layout: 'horizontal',
	top:10,
	height:70,
});

//change on v20150909 width to 49%
var Next = Titanium.UI.createButton({title: 'Next >', width: '49%', height: 60});
	Next.addEventListener('click',function(e) {initial=initial+10;searchDB(textField.value);totalRecordInfoFlag = false;});
var Prev = Titanium.UI.createButton({title: '< Prev', width: '49%', height: 60});
	Prev.addEventListener('click',function(e) {initial=initial-10;searchDB(textField.value);totalRecordInfoFlag = false;});
navigationBar.add(Prev);
navigationBar.add(Next);

win.add(labelStart);
win.add(textField);
win.add(inputBar);
win.add(searchBar);
win.add(resultCard);