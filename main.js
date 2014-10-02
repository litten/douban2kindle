var http = require('http');
var fs = require('fs');
var cheerio = require('cheerio');
var eventproxy = require('eventproxy');
var cmd = require('child_process').exec;
var parseString = require('xml2js').parseString;

var Main = (function(){

	var _path = "";
	var _opt = {};
	var _json = {};

	//作者
	var _author = "";
	var _authorName = "";

	//分页处理
	var _pageCtrl = {
		idx: 0,
		per: 20,
		total: 0
	}
	//是否已返回过分页
	var _pageInit = false;

	//html格式模版
	var _tpl = '<!DOCTYPE html>\
		<html lang="en">\
		<head>\
			<meta http-equiv="Content-Type" content="text/html; charset=utf-8"/>\
			<title>{{title}}</title>\
		</head>\
		<body>\
			{{ctn}}\
		</body>\
	</html>';

	//写零散文件后统一回调
	var epWriteFile = new eventproxy();


	//日期格式化
	var formatDate = function(date, split){
		var d = new Date(date);
		return d.getFullYear()+split+(d.getMonth()+1)+split+d.getDate();
	}

	//生成mobi文件
	var gen2mobi = function(){
		cmd('kindlegen.exe ' + _path + '/'+_authorName+'的豆瓣日志.html', function(error, stdout, stderr){
        	console.log("\n已生成mobi文件！");
		});
	}

	//将数据生成md文件
	var gen2md = function(obj){
		var time = formatDate(obj.published, ".");
		var content = "##　　"+obj.title+"\n\n"+"``"+_json.feed.author[0].name+" - "+time+"``\n\n"+obj.content;
		var title = formatDate(obj.published, "-")+" "+obj.title;
		fs.writeFile(_path + '/'+title+'.md', content.replace(/<br>/g, "\n"), function(err){
	        console.log("《"+obj.title+"》……已完成");
	    });
	}

	//将数据生成html文件
	var gen2html = function(obj){
		var time = formatDate(obj.published, ".");
		var content = "<h2>"+formatDate(obj.published, "-")+" "+obj.title+"</h2><code>"+_json.feed.author[0].name+"</code><br><br><div>"+obj.content+"</div>";
		var title = formatDate(obj.published, "-")+" "+obj.title;
		fs.writeFile(_path + '/'+title+'.html', _tpl.replace(/{{title}}/g, title).replace(/{{ctn}}/g, content), function(err){
	        console.log("《"+obj.title+"》……已完成");
	        epWriteFile.emit('writeFile', "succ");
	    });
	}

	//生成合并文件
	var genInAll = function(){

		fs.readdir(_path, function(err, files) {  
		    if (err) {  
		        console.log('read dir error');  
		    } else {  
		    	var wording = "";
		        files.forEach(function(item) {  
		            var tmpPath = _path + '/' + item;  
		            var data=fs.readFileSync(tmpPath,"utf-8");
		            var $ = cheerio.load(data);
		            wording = wording+$('body').html()+"<br><br>";
		        });  

		        var text = _tpl.replace(/{{title}}/g, _authorName+'的豆瓣日志').replace(/{{ctn}}/g, wording);
		        fs.writeFile(_path + '/'+_authorName+'的豆瓣日志.html', text, function(err){
		    		console.log("\n已生成合并日志文件！");
		    		gen2mobi();
			    });
		    }  
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

	//得到分页之后，异步获取所有文章内容
	var autoGetPage = function(){
		for(var i=_pageCtrl.per; i<_pageCtrl.total; i=i+_pageCtrl.per){
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
				console.log('statusCode is '+res.statusCode);
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
					    //gen2md(obj);  
					    gen2html(obj);
					});
					//已返回分页，开始自动抓取
					if(!_pageInit){
						_pageInit = true;
						_pageCtrl.idx = 2;
						_pageCtrl.total = result["feed"]["openSearch:totalResults"][0];
						_authorName = result["feed"]["author"][0]["name"];

						epWriteFile.after('writeFile', _pageCtrl.total, function (list) {
							genInAll();
						});
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
		mkdir("ebook");
		mkdir(_path);
		getPage(_opt, true);
	}	

	return {
		init: init
	}
})();

Main.init({
	people: "mejiaqian"
});