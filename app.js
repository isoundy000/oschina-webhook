var express = require('express');
var bodyParser = require('body-parser');
var	shell = require('shelljs');
var	http = require('http');
var	fs = require('fs');
var	app = express();

var config = require('./config.json');
var	port = config.port;
var template = config.template;
var projects = config.projects;

var	log = fs.createWriteStream('./webhook.log',{flags:'a'});

app.use(bodyParser.urlencoded({extended: true}));

function format(template, project) {
	var commands = template.slice(0);
	for(var i = 0, len=commands.length; i<len; i++){
		for(var key in project){
			commands[i] = commands[i].replace(key, project[key]);
		}
	}

	return commands.join(' && ');
}

projects.map(function (project) {

	if(!project.workStatus) return;

	var path = '/' + project.appName + '/' + project.gitBranch;
	app.post(path, function (req, res, next) {

		var hook = JSON.parse(req.body.hook);
		if (project.webhookPassword != hook.password) {
			res.sendStatus(500);
			return;
		}

		var id = hook.push_data.commits[0].id;
		var name = hook.push_data.user_name;

		var commands = format(template, project);
		shell(commands, function (err) {
			if (err instanceof Error) {
				log.write(new Date()+'\n提交人:'+name+'\n分支:'+path+'\n任务id：'+id+'\n状态：失败\n原因：'+err+'\n\n');
				res.sendStatus(500);
				return;
			}

			log.write(new Date()+'\n提交人:'+'\n分支:'+path+'\n任务id：'+id+'\n状态：成功\n\n');
		})
		res.sendStatus(200)
	})
})

http.createServer(app).listen(port, function () {
	console.log('oschina-webhook服务器启动, 端口:' + port);
});
