import showdown from "showdown";

const blockType = {
  SUBSTITUTION: 1,
  INCLUDE: 2,
  OTHER:-1,
}

export class RstRenderer {
  constructor(server, manager){
    this.converter = new showdown.Converter();
    this.server = server;
    this.substitutions = {};
    this.manager = manager;
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
      const parts2  = lines[0].split(' ');
      if (parts2.length==3 && parts2[1]==="include::"){
        obj.type = blockType.INCLUDE;
        obj.value = parts2[2];
      }else{
        obj.type = blockType.OTHER;
        obj.value = lines[0].substr(3);
      }
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
          switch (objBlock.type){
            case blockType.SUBSTITUTION:
              this.substitutions[objBlock.key] = objBlock;
              break;
            case blockType.INCLUDE:
              return this.manager.getResource(
                `INCLUDE_${objBlock.value}`,
                `${this.server}/docs/${objBlock.value}`,
                this.markup2html.bind(this),
                `INCLUDE_${objBlock.value}`,
                false
              );
              // return 'INCLUDE: '+objBlock.value;
          }
          block='';
        }
      }
      return line;
    }).join('\n');

    return text;
  }
  renderHTMLAtrributes(list, ignore=[]){
    return Object.keys(list)
      .filter(k=>ignore.indexOf(k)===-1)
      .map(k=>k+`="${list[k]}"`)
      .join("");
  }
  applySubstitutions(txt) {
    let newText = txt;
    for (const key in this.substitutions){
      const value = this.substitutions[key].value;
      let replacement = '';
      if (value.type=="image"){
        replacement = `<img src="${this.server}/docs/${value.value}" ${
          this.renderHTMLAtrributes(value.attributes, ['alt','target'])
        }/>`;
        if ("target" in value.attributes)
          replacement = `<a href="${value.attributes.target}" ${
            this.renderHTMLAtrributes(value.attributes, ['value', 'target'])
          }>${
            replacement
          }</a>`
      } else {
        replacement = value.value;
      }
      // console.log(`|${key}|`,replacement);
      newText = newText.replace(`|${key}|`,replacement);
    }
    return newText;
  }
  toMDTables(txt) {
    let onTable = false;
    return txt.split('\n').map(l=>{
      const isRow = l.indexOf('+--')===0 || l.indexOf('+==')===0;
      const partOfTable = l.indexOf('|')===0;
      if (!onTable && isRow){
        onTable=true;
        return '<div style="margin: 10px auto;"><table class="from-md">';
      }
      if (onTable && isRow) return '';
      if (onTable && !isRow && partOfTable){
        return '<tr><td>'+l.split('|').slice(1,-1).join('</td><td>')+'</td></tr>'
      }
      if (onTable && !isRow && !partOfTable){
        onTable = false;
        return '</table></div>';
      }
      return l;
    }).join('\n');
  }
  addHyperLinks(txt){
    const re = /`([a-zA-Z\-:@/\.\d]+)\s<([a-zA-Z\-:@#/\.\d?=&]+)>`_/g;
    return txt.replace(re, '<a href="$2">$1</a>');
  }
  addBrTags(txt) {
    let onTable = false;
    return txt.split('\n').map(
      l => l.replace(/^\|/, '<br />')
    ).join('\n');
  }
  markup2html (txt) {
    let text = this.addHyperLinks(txt);
    text = this.extractBlocks(text);
    text = this.applySubstitutions(text);
    text = this.toMDTables(text);
    text = this.addBrTags(text);
    return '<br/>'+this.converter.makeHtml(text);
  }

}
