// 包装函数
module.exports = function(grunt) {
	//目录设定
	var _config = {
		srcPath: 'src/',
		buildPath: 'build/',
		nwPath: 'nw/'
	};
	// 任务配置
	grunt.initConfig({
		cfg: _config,
		less: {
			development: {
				options: {
				  	paths: ["<%= cfg.srcPath %>"]
				},
				files: {
				  	"<%= cfg.buildPath %>css/main.css": "<%= cfg.srcPath %>css/main.less"
				}
			}
		},
		uglify: {
			dev: {
				files: {
					'<%= cfg.buildPath %>js/douban2kindle.min.js': ['<%= cfg.srcPath %>js/*.js']
				}
			}
		},
		copy: {
		  	main: {
		  		expand: true,
			    cwd: '<%= cfg.srcPath %>',
			    src: '**',
			    dest: '<%= cfg.buildPath %>'
		  	},
		},
		nodewebkit: {
			options: {
			    platforms: ['win'],
			    buildDir: '<%= cfg.nwPath %>', 
			},
			src: ['<%= cfg.buildPath %>**/*'] 
		},
		watch: {
			options: {
		      	livereload: true,
		    },
			all: {
				files: ['<%= cfg.srcPath %>**.*', '<%= cfg.srcPath %>**/**.*'],
				tasks: ['copy:main','uglify:dev','less:development']
			}
		}
	});

	// 任务加载
	grunt.loadNpmTasks('grunt-contrib-uglify');
	grunt.loadNpmTasks('grunt-contrib-watch');
	grunt.loadNpmTasks('grunt-contrib-less');
	grunt.loadNpmTasks('grunt-contrib-copy');
	grunt.loadNpmTasks('grunt-node-webkit-builder');

	// 自定义任务
	grunt.registerTask('default', ['copy:main','uglify:dev','less:development','nodewebkit']);
	grunt.registerTask('dev', ['copy:main','uglify:dev','less:development','watch']);
	grunt.registerTask('nw', ['nodewebkit']);
};