var douban2kindle = (function(){

	var _people = "";
	
	var $ipt = document.getElementById("ipt");
	var $tips = document.getElementById("tips"); 
	var $who = document.getElementById("who"); 
	var $start = document.getElementById("start"); 
	var $file = document.getElementById("file-dialog"); 
	var $sec1 = document.getElementById("sec-1"); 
	var $sec2 = document.getElementById("sec-2"); 
	var $sec3 = document.getElementById("sec-3"); 

	var showTips = function(word){
		$sec1.className = "hide";
		$sec3.className = "hide";
		$sec2.className = "";
		$tips.innerHTML = word;
	}

	var showCover = function(){
		$sec2.className = "hide";
		$sec3.className = "hide";
		$sec1.className = "";
	}

	var showStart = function(who){
		$sec1.className = "hide";
		$sec2.className = "hide";
		$sec3.className = "";
		$who.innerHTML = who;
	}

	var check = function(val){
		//url like this: http://www.douban.com/people/litten/
		var valSplit = val.split("/");
		var resultArr = [];
		var count = 0;
		for(var i=0,len=valSplit.length; i<len; i++){
			if(!!valSplit[i]){
				if(valSplit[i] == "www.douban.com" || valSplit[i] == "m.douban.com" || valSplit[i] == "people"){
					count++;
				}
				resultArr.push(valSplit[i]);
			}
		}
		if(count == 2 && resultArr[resultArr.length-2] == "people"){
			return (resultArr[resultArr.length-1]);
		}else{
			return false;
		}
	}

	var bind = function(){
		$ipt.onpaste =  $ipt.onkeyup = function(e){
			setTimeout(function(){
				var val = $ipt.value;
				if(val == ""){
					showCover();
					return;
				}

				var people = check(val);
				if(people){
					_people = people;
					showStart(people);
				}else{
					showTips("输入豆瓣主页地址格式错误");
				}
			},100);
		}
		
		$start.onclick = function(){
			$file.click();
		}

		$file.onchange = function(){
			var path = this.value;
			Main.init({
				people: _people,
				path: path
			});
		}
	}

	return {
		init: function(){
			bind();
		}
	}
})();

window.onload = function(){
	douban2kindle.init();
}