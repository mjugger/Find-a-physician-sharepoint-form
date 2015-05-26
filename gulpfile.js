var gulp     = require('gulp');
var concat   = require('gulp-concat');
var uglify  = require('gulp-uglify');

gulp.task('scripts',function(){
	return gulp.src([
			'bower_components/sp-services/src/jquery.SPServices.js',
			'resources/js/form.js'
		])
		.pipe(concat('all.fap.min.js'))
		.pipe(uglify())
		.pipe(gulp.dest('build/js'));
});

gulp.task('watch',function(){
	gulp.watch('resources/js/*js',['scripts']);
});

gulp.task('default',['scripts','watch']);