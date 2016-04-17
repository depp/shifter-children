<!doctype html>
<html>
  <head>
    <meta charset="UTF-8">
    <title>${title|h}</title>
    <style type="text/css">${css_data|h}</style>
  </head>
  <body>
    <div id="main">
      <div id="game"></div>
      <p id="version">${version|h}</p>
    </div>
    <div id="instructions">
      <h1>${title|h}</h1>
      ${instructions}
    </div>
    <script type="text/javascript">${js_data}</script>
  </body>
</html>
