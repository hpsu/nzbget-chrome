window.addEvent('domready', function(){
	opts = new Options();
	
	$('btn_save').addEvent('click', function(){
		opts.save();
	});
});

Options = new Class({
	initialize: function() {
		this.load();
	}
	,load: function() {
		Array.each($$('input[type=text],input[type=password]'), function(o){
			o.value = this.get(o.id);
		},this);
	}
	,save: function() {
		Array.each($$('input[type=text],input[type=password]'), function(o){
			console.log('set',o.value);
			localStorage[o.id] = o.value;
		},this);
	}
	,get: function(opt) {
		return typeof localStorage[opt] != 'undefined' ? localStorage[opt] : '';
	}
	,testConnect: function() {
        var url = this.get('opt_host')
        	,port = this.get('opt_port')
        	,username = this.get('opt_username')
        	,password = this.get('opt_password');

        var query = {
            version: '1.1'
            ,method: "writelog"
            //,method: 'version'
            ,params: ["INFO", "Chrome extension successfully connected."]
        };

        new Request.JSON({
        	url: 'http://' + url + ":" + port + "/jsonrpc"
        	,data: JSON.encode(query)
        	,user: username
        	,password: password
        }).send(query);
	}
});