import showdown from "showdown";

const blockType = {
  SUBSTITUTION: 1,
  OTHER:-1,
}

export class RstRenderer {
  constructor(server){
    this.converter = new showdown.Converter();
    this.server = server;
    this.substitutions = {};
  }

  parseBlock(block){
    const obj = {};
    const lines = block.split('\n');
    const parts  = lines[0].split('|');
    if (parts.length==3 && parts[0].trim()==='..'){
      obj.type = blockType.SUBSTITUTION;
      obj.key = parts[1];
      const value = parts[2].split('::');
      obj.value = {
        type: value[0].trim(),
        value: value[1].trim(),
        attributes: {}
      }
    } else {
      obj.type = blockType.OTHER;
      obj.value = lines[0].substr(3);
    }
    for (let i=1;i<lines.length;i++){
      if (obj.type === blockType.SUBSTITUTION){
        const attr = lines[i].split(':');
        if (attr.length > 2 && attr[1].trim() !== ""){
          obj.value.attributes[attr[1]] = attr.slice(2).join(':');
        }
      } else {
        obj.value += lines[i].trim()
      }
    }
    return obj;
  }

  extractBlocks(txt){
    let block = '';
    let text = txt.split('\n').map(line => {
      if (line.indexOf('..')===0) {
        block += line+'\n';
        return '';
      }
      if (block !== ''){
        if (line.indexOf('  ')===0 && line.trim()!==''){
          block += line+'\n';
          return '';
        }else{
          const objBlock = this.parseBlock(block);
          if (objBlock.type === blockType.SUBSTITUTION){
            this.substitutions[objBlock.key] = objBlock;
          }
          block='';
        }
      }
      return line;
    }).join('\n');

    return text;
  }

  applySubstitutions(txt) {
    let newText = txt;
    for (const key in this.substitutions){
      const value = this.substitutions[key].value;
      let replacement = '';
      if (value.type=="image"){
        replacement = `<img src="${this.server}/docs/${value.value}" ${
          Object.keys(value.attributes)
            .map(k=>k+`="${value.attributes[k]}"`)
            .join("")
        }/>`
      } else {
        replacement = value.value;
      }
      console.log(`|${key}|`,replacement);
      newText = newText.replace(`|${key}|`,replacement);
    }
    return newText;
  }
  toMDTables(txt) {
    let onTable = false;
    return txt.split('\n').map(l=>{
      const isRow = l.indexOf('+--')===0;
      const partOfTable = l.indexOf('|')===0;
      if (!onTable && isRow){
        onTable=true;
        return '<table>';
      }
      if (onTable && isRow) return '';
      if (onTable && !isRow && partOfTable){
        return '<tr><td>'+l.split('|').slice(1,-1).join('</td><td>')+'</td></tr>'
      }
      if (onTable && !isRow && !partOfTable){
        onTable = false;
        return '</table>';
      }
      return l;
    }).join('\n');
  }
  markup2html (txt) {
    let text = txt
      .replace("[BUTTON_BROWSE]", '<a href="#browse" class="button">Browse</a>')
      .replace("[BUTTON_VIEWER]", '<a href="#viewer" class="button">Viewer</a>');
    text = this.extractBlocks(text)
    text = this.applySubstitutions(text);
    text = this.toMDTables(text)
    return '<br/>'+this.converter.makeHtml(text);
  }

}
