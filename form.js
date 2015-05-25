(function(){
	"use strict";
	var properties = {
		//the overlay element
		overlay:null,
		//the submit button
		submit:null,
		//the form element
		form:null,
		//list to add new form data to.
		formList:"",
		//context url of where the list lives
		domainURL:"",
		//options for validation
		validateOptions:null,
		//element to show when submission is successful
		successEl:null,
		//dropdown element for countries
		countryDropdown:null,
		//dropdown element for US states
		stateDropdown:null,
		//holds the us states list data
		usStatesData:null
	}

	//the grecaptcha object instance.
	var captcha = null;

	//creates a safe console log
	var safeConsole = (console ? (console.warn.bind(console) || console.log.bind(console)) : function (m) { return m; });

	function formConstructor(options){
		//checks if this is a new instance.
		if(!(this instanceof formConstructor)) {
			throw 'the form js must be constructed with new.';
		}
		//checks if SPservices is available.
		if(!$().SPServices){
			throw " the dependance \"SP services\" was not found! please download the latest (https://spservices.codeplex.com) and load it before this file.";
		}
		//checks if jquery validate is available.
		if(!$().validate){
			throw "the dependance \"jquery validatation\" was not found! please download the latest (http://jqueryvalidation.org) and load it before this file."
		}
		
		this.applyOptions(options);

		this.initGreCaptcha(this.init);
	}

	formConstructor.prototype.init = function(){
		var me = this;

		this.resizeIframe();

		//creates the values for the contry dropdown.
		this.getList('http://givenimaging.com','Countries',false,function(){

			me.createCountryStateOptions.apply(me,arguments);
			
			//creates and stores the values for the us states dropdown.
			this.getList('http://givenimaging.com','US States',false,function(){
				safeConsole('this = ',me);
				//cache US States list data for multi use
				properties.usStatesData = me.createCountryStateOptions.apply(me,arguments);

				//add events
				me.initEvents();
			});

		},[properties.countryDropdown]);

		//init validate plugin
		this.createValidator();
	}

	/**
	 * [applyOptions: applys the options given to this instance]
	 * @param  {[object]} options [the parameters given to this instance]
	 */
	formConstructor.prototype.applyOptions = function(options){
		for(var key in options){
			if(key in properties){
				properties[key] = options[key];
			}
		}
	}

	formConstructor.prototype.initEvents = function(){
		var me = this;
		properties.submit.on('mouseup',function(){
			me.submitForm();
		});

		properties.countryDropdown.on('change',function(){
			if($(this).val().search(/united states/ig) > -1){
				var clonedFrag = properties.usStatesData.cloneNode(true);
				properties.stateDropdown.rules('add','required');
				properties.stateDropdown.append(clonedFrag);
				properties.stateDropdown.parents('.row').removeClass('hide');
			}else{
				properties.stateDropdown.parents('.row').addClass('hide');
				properties.stateDropdown.rules('remove','required');
				properties.stateDropdown.empty();
			}
		});
	}

	formConstructor.prototype.createValidator = function(){
		if(!properties.validateOptions){
			throw "No options for validatation provided.";
		}
		if(properties.form.length === 0){
			throw "No form selector provided."
		}
		properties.form.validate(properties.validateOptions);
		console.log(properties.form);
	}

	/**
	 * [getList: retrives sharepoint lists]
	 * @param  {[string]}   url            [base url where the list lives]
	 * @param  {[string]}   listName       [name of the list to retrive]
	 * @param  {[string]}   caml           [caml query string]
	 * @param  {Function}   callback 	   [called when list is finally retrived]
	 * @param  {Array}      callbackParams [array of extra arguments for the callback fn]
	 */
	formConstructor.prototype.getList = function(url,listName,caml,callback,callbackParams){
		//keeps context of this.
		var me = this;
		this.loadStart();
		var list = $().SPServices.SPGetListItemsJson({
		  webURL: url,
		  listName: listName,
		  viewName: "",
		  CAMLQuery: caml || "",
		  CAMLViewFields: "",
		  CAMLRowLimit: "",
		  CAMLQueryOptions: "",
		  changeToken: "",
		  contains: "",
		  mapping: null,
		  mappingOverrides: null,
		  debug: false
		});

		$.when(list).done(function(){
			if(callback && typeof callback === "function"){
				if(callbackParams && callbackParams instanceof Array){
					callbackParams.splice(0,0,this.data,listName);
					callback.apply(me,callbackParams);
				}else{
					callback(this.data,listName);
				}
			}
			me.loadDone();
		});
	}

	/**
	 * [CreateNewItem: creates a new item in the specified list]
	 * @param {[string]}       url        [base url where the list lives]
	 * @param {[2lvl array]}   valuepairs [an array of valuepair arrays for each column]
	 * @param {[string]}       listName   [name of the list to retrive]
	 * @param {Function}       callback   [called when list item is added successfully]
	 */
	formConstructor.prototype.CreateNewItem = function(url,valuepairs,listName,callback,callbackParams) {
		//keeps context of this.
		var me = this;
		this.loadStart();
	    $().SPServices({
	    	webURL:url,
	        operation: "UpdateListItems",
	        async: false,
	        batchCmd: "New",
	        listName: listName,
	        valuepairs: valuepairs,
	        completefunc: function(xData, Status) {
				if(callback && typeof callback === "function"){
					callback();
				}
				console.log(xData,Status);
				me.loadDone();
	        }
	    });
	}

	formConstructor.prototype.submitForm = function(){
		var isValid = properties.form.valid();
		var valuepairs = this.createValuePairs( $('.formElement') );
		if(isValid){
			this.CreateNewItem(properties.domainURL,valuepairs,properties.formList,this.showSuccessMessage);
		}
			
	}

	formConstructor.prototype.showSuccessMessage = function(){
		properties.form.fadeOut(100,function(){
			properties.successEl.fadeIn();
		});
	}

	formConstructor.prototype.resizeIframe = function(){
		//http://stackoverflow.com/a/935537/98933
		var parentFrame = parent.document.getElementById(window.name);
		if(parentFrame){
			var D = document;
			//http://james.padolsey.com/javascript/get-document-height-cross-browser/
			var dheight = Math.max(
			Math.max(D.body.scrollHeight, D.documentElement.scrollHeight),
			Math.max(D.body.offsetHeight, D.documentElement.offsetHeight),
			Math.max(D.body.clientHeight, D.documentElement.clientHeight)
			);
			parentFrame.style.height = dheight + 100 + 'px';
		}else{
			safeConsole('No IFRAME detected, skipping resizing...');
		}
	}

	formConstructor.prototype.initGreCaptcha = function(){
		var me = this;
		window.onloadCallback = function(){
			me.init();
			captcha = grecaptcha;
			// captcha.render('g-recaptcha',{
			// 	sitekey:'6LdvUwYTAAAAAJs8IsR2DldTkmvYhtoob45sjmuk',
			// 	theme:'light'
			// });
		}
	}

	/**
	 * [loadStart: shows the loading overlay]
	 */
	formConstructor.prototype.loadStart = function(){
		properties.overlay.show();
	}

	/**
	 * [loadDone: hides the loading overlay]
	 */
	formConstructor.prototype.loadDone = function(){
		properties.overlay.hide();
	}

	/**
	 * [createValuePairs description]
	 * @param  {[array]} formEls               [all form elements]
	 * @return {[array]} valuePairArray        [2lvl array of value pairs for the list columns]
	 */
	formConstructor.prototype.createValuePairs = function(formEls){
		var valuePairArray = [];
		for (var i = formEls.length - 1; i >= 0; i--) {
			if(formEls[i].value){
				valuePairArray.push([formEls[i].name,formEls[i].value]);
			}
		};
		return valuePairArray;
	}

	/**
	 * [createCountryStateOptions: creates options for the country/state dropdown]
	 * @param  {[array]} listData [data retrived from the sharepoint list]
	 * @TODO: may need to templify this method (i.e. make it customizable from the outside)
	 */
	formConstructor.prototype.createCountryStateOptions = function(listData,listName,appendTo){
		var docFrag = document.createDocumentFragment();
		var optionEl = null;
		var theList = listName.toLowerCase();
		if(listData.length){
			listData.reverse();
			for (var i = listData.length - 1; i >= 0; i--) {
				optionEl = document.createElement('option');
				if(theList === 'countries'){
					optionEl.innerHTML = listData[i].Title;
				}else if(theList === 'us states'){
					optionEl.innerHTML = listData[i].abbreviation;
				}
				docFrag.appendChild(optionEl);
			};
			if(appendTo){
				appendTo.html(docFrag);
			}else{
				return docFrag;
			}
		}
	}

	if(!window.formjs){
		window.formjs = formConstructor;
	}else if(window.formjs && window.formjs !== formConstructor){
		safeConsole("Cannot assign \"formConstructor\" to the property formjs on the window object because it already is assigned a value.");
		return false;
	}

})();