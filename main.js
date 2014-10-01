var http = require('http');
var fs = require('fs');
var cheerio = require('cheerio');
var parseString = require('xml2js').parseString;

var Main = (function(){

	var _path = "";
	var _opt = {};
	var _json = {};

	var _author = "";

	var _pageCtrl = {
		idx: 0,
		per: 20,
		total: 0
	}
	//是否已返回过分页
	var _pageInit = false;

	//将数据生成md文件
	var gen2md = function(obj){
		var date = new Date(obj.published);
		var time = date.getFullYear()+"."+(date.getMonth()+1)+"."+date.getDate();
		var content = "##"+obj.title+"\n"+"``"+_json.feed.author[0].name+" - "+time+"``\n\n"+obj.content;
		var title = date.getFullYear()+"-"+(date.getMonth()+1)+"-"+date.getDate()+" "+obj.title;
		fs.writeFile(_path + '/'+title+'.md', content.replace(/<br>/g, "\n"), function(err){
	        console.log("《"+obj.title+"》……已完成");
	    });
	}

	//生成作者文件夹
	var mkdir = function(path){
		if (!fs.existsSync(path)) {
            if (!fs.mkdirSync(path)) {
                return false;
            }
        }
	}

	var autoGetPage = function(){
		for(var i=0; i<_pageCtrl.total; i=i+_pageCtrl.per){
			getPage({
				host: _opt.host,
			    port: _opt.port,
			    path: '/people/'+_author+'/notes?start-index='+(i+1)+'&max-results='+_pageCtrl.per
			});
		}
		
	}
	//抓取页面
	var getPage = function(opt){
		http.get(opt , function(res){
	        if (res.statusCode!=200){
				console.log('statusCode is not 200');
				return;
			}
			var buffers = [], size = 0;
			res.on('data', function(buffer) {
				buffers.push(buffer);
				size += buffer.length;
			});

			res.on('end', function() {
				var buffer = new Buffer(size), pos = 0;
				for(var i = 0, l = buffers.length; i < l; i++) {
					buffers[i].copy(buffer, pos);
					pos += buffers[i].length;
				}

				var text = buffer.toString();
				parseString(text, function (err, result) {
					_json = result;
				    result.feed.entry.forEach(function(obj){  
					    gen2md(obj);  
					});
					//已返回分页，开始自动抓取
					if(!_pageInit){
						_pageInit = true;
						_pageCtrl.idx = 2;
						_pageCtrl.total = result["feed"]["openSearch:totalResults"][0];
						autoGetPage();
					}
					
				});
			});
		});
	}

	//初始化
	var init = function(param){
		_opt = {
		    host: 'api.douban.com',
		    port: 80,
		    path: '/people/'+param.people+'/notes?start-index=1&max-results='+_pageCtrl.per
		}
		_author = param.people;
		_path = 'ebook/'+param.people;
		mkdir(_path);
		getPage(_opt);
	}	

	return {
		init: init
	}
})();

Main.init({
	people: "zhangjiawei"
});