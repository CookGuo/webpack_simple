function loader(source) {
  let style = `
    var style = document.createElement('style');
    style.innerHTML = ${JSON.stringify(source)};
    document.appendChild(style);
  `
  return style
}

module.exports = loader