# express-views-auto-reload
a express middleware that can auto reflush your web page when the files changed    
only useful in express view mode


###install
npm install views-auto-reload --save-dev 

###use 
```
import express from 'express'
import autoreload from 'views-auto-reload'

let app = express()

app.set('views', path.join(__dirname, 'views'))  //set you own view path
app.set('view engine', 'jade')  //set you own view path

app.use(autoreload(app, {suffix: ['.jade']}))

app.get('/', (req, res) => {
  // the auto-reload will overwrite the render function
  // when the hello.jade change, the client brower will execute 'location.reload()' function
  res.render('hello.jade') 
})
....
....
```
