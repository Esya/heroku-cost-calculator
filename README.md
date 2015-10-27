# heroku-cost-calculator

This simple node module will give you detailed pricing for all your Heroku applications in one single command and only requiring your API Token. **This price is only an estimate at the given time that you run the command**.

Example output : 

![Example screenshot](https://raw.githubusercontent.com/Esya/heroku-cost-calculator/master/screenshot.png)

### Usage
```shell
npm install -g hcc
hcc --token your-heroku-token
```

### Caveat
For now shared addons will be added multiple times to the total cost for the whole account.
