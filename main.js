var http = require('http');
var fs = require('fs');
var cheerio = require('cheerio');
var eventproxy = require('eventproxy');
var ejs = require('ejs');
var cmd = require('child_process').exec;
var parseString = require('xml2js').parseString;

var Main = (function(){

	var _path = "";
	var _opt = {};
	var _json = {};

	//作者
	var _author = "";
	var _authorName = "";
	var _authorFace = "";

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
		split = split || "-";
		var d = date?new Date(date):new Date();
		function char2(str){
			return (str.toString().length == 1)?"0"+str:str;
		}
		return d.getFullYear()+split+char2((d.getMonth()+1))+split+char2(d.getDate());
	}

	//保存图片
	var getImg = function (src, name){
		http.get(src, function (res) {
	        res.setEncoding('binary');
	        var imageData ='';
	        res.on('data',function(data){
	            imageData += data;
	        }).on('end',function(){
	        	var srcSplit = src.split("/");
	        	name = name || srcSplit[srcSplit.length-1];
	            fs.writeFile(_path+'/img/'+name, imageData, 'binary', function (err) {
	                if (err) throw err;
	            });
	        });
	    });
	}

	//替换文章当中的图片
	var replaceImg = function(content){
		var $ = cheerio.load(content);
		var imgArr = $("img");
		for(var i=0,len=imgArr.length; i<len; i++){
			var src = imgArr[i]["attribs"]["src"];
			var srcSplit = src.split("/");
	        var name = srcSplit[srcSplit.length-1];
	        var rex = new RegExp(src,"g");
	        content = content.replace(rex, 'img/'+name);
			getImg(src);
		}
		return content;
	}

	//生成mobi文件
	var gen2mobi = function(){
		console.log('kindlegen.exe ' + _path + '/'+_authorName+'的豆瓣日志.opf');
		cmd('kindlegen.exe ' + _path + '/'+_authorName+'的豆瓣日志.opf', function(error, stdout, stderr){
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
		var title = formatDate(obj.published, "-")+" "+obj.title;
		var content = "<h2>"+obj.title+"</h2><code>"+_json.feed.author[0].name+" "+formatDate(obj.published, "-")+"</code><br><br><div>"+obj.content+"</div>";
		//content = content.replace(/<br>+|&nbsp;+/g,"<br>");
		content = _tpl.replace(/{{title}}/g, title).replace(/{{ctn}}/g, content);
		content = replaceImg(content);
		
		fs.writeFile(_path + '/'+title+'.html', content, function(err){
	        console.log("《"+obj.title+"》……已完成");
	        epWriteFile.emit('writeFile', "succ");
	    });
	}

	//生成目录
	var genTOC = function(data){
		var html = ejs.render(fs.readFileSync('tpl/toc.ejs', 'utf8') , data); 
		fs.writeFile(_path + '/toc.html', html, function(err){

	    });
	}
	//生成opf文件
	var genOPF = function(data){
		var html = ejs.render(fs.readFileSync('tpl/opf.ejs', 'utf8') , data); 
		fs.writeFile(_path + '/'+_authorName+'的豆瓣日志'+'.opf', html, function(err){

	    });
	}

	//生成ncx文件
	var genNCX = function(data){
		var html = ejs.render(fs.readFileSync('tpl/ncx.ejs', 'utf8') , data); 
		fs.writeFile(_path + '/'+_authorName+'的豆瓣日志'+'.ncx', html, function(err){

	    });
	}

	//按日期生成文件对象
	var fileInfo = function(itemArr){
		var dir = {
			"01": "一月",
			"02": "二月",
			"03": "三月",
			"04": "四月",
			"05": "五月",
			"06": "六月",
			"07": "七月",
			"08": "八月",
			"09": "九月",
			"10": "十月",
			"11": "十一月",
			"12": "十二月",
		}
		var obj = {};
		for(var i=0,len=itemArr.length; i<len; i++){
			var dateStr = itemArr[i].substr(0,10);
			var dateStrSplit = dateStr.split("-");
			var name = itemArr[i].replace(/.html/g,"");
			var year = dateStrSplit[0];
			var month = dir[dateStrSplit[1]];

			if(!obj[year]) obj[year] = {};
			if(!obj[year][month]) obj[year][month] = [];

			obj[year][month].push(name);
		}
		
		console.log(obj);
		return obj;
	}
	//生成合并文件
	var genInAll = function(){

		fs.readdir(_path, function(err, files) {  
		    if (err) {  
		        console.log('read dir error');  
		    } else {  
		    	var wording = "";
		    	var title = _authorName+'的豆瓣日志';
		    	var pathArr = [];

		        files.forEach(function(item) { 
		        	if(item.indexOf("coverpage.html") >= 0 || item.indexOf(".html") < 0 || item.indexOf("toc.html") >= 0 || item.indexOf("的豆瓣日志") >= 0) return; 

		        	pathArr.push(item);
		            var tmpPath = _path + '/' + item;  
		            var data=fs.readFileSync(tmpPath,"utf-8");
		            var $ = cheerio.load(data);
		            wording = wording+$('body').html()+"<br><br>";
		        });  

		        //生成opf和ncx文件
		        var param = {
		        	title: title,
		        	bookId: title,
		        	author: _authorName,
		        	time: formatDate(),
		        	description: title,
		        	identifier: title,
		        	pathArr: pathArr,
		        	fileInfo: fileInfo(pathArr)
		        }

		        genOPF(param);
		        genNCX(param);
		        genTOC(param);

		        //生成合并后的html
		        var text = _tpl.replace(/{{title}}/g, title).replace(/{{ctn}}/g, wording);
		        fs.writeFile(_path + '/'+title+'.html', text, function(err){
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

						

						createCover(result);

						epWriteFile.after('writeFile', _pageCtrl.total, function (list) {
							genInAll();
						});
						autoGetPage();
					}
					
				});
			});
		});
	}

	//复制css文件
	var createCss = function(){
		var css = ejs.render(fs.readFileSync('tpl/style.css', 'utf8') , {}); 
		fs.writeFile(_path + '/css/style.css', css, function(err){

	    });
	}

	//生成封面
	var createCover = function(result){
		var faceLink = result["feed"]["author"][0]["link"][2]["$"]["href"];
		var faceLinkSplit = faceLink.split("/");
		faceLinkSplit[faceLinkSplit.length-1] = "ul"+faceLinkSplit[faceLinkSplit.length-1].substr(1);
		_authorFace = faceLinkSplit.join("/");

		var html = ejs.render(fs.readFileSync('tpl/coverpage.ejs', 'utf8') , {
			author: _authorName
		}); 
		fs.writeFile(_path + '/coverpage.html', html, function(err){

	    });

	    getImg(_authorFace, "cover.jpg");
	}
	//初始化
	var init = function(param){
		//清除上次log
		cmd('cls', function(error, stdout, stderr){
		});

		_opt = {
		    host: 'api.douban.com',
		    port: 80,
		    path: '/people/'+param.people+'/notes?start-index=1&max-results='+_pageCtrl.per
		}
		_author = param.people;
		_path = 'ebook/'+param.people;
		mkdir("ebook");
		mkdir(_path);
		mkdir(_path+"/img");
		mkdir(_path+"/css");

		createCss();
		getPage(_opt, true);
		//_authorName = "嘉倩";
		//_authorName = "张佳玮";
		//createCover();
		//genInAll();
	}	

	return {
		init: init
	}
})();

Main.init({
	people: "zhangjiawei"
});