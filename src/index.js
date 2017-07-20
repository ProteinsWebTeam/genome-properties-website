import showdown from "showdown";
import parseGenProp from "./genprop-parser";
import parseGenPropHierarchy from "./genprop-hierarchy-parser";

class GenomePropertiesWebsite {
  constructor(selector) {
    this.container = document.querySelector(selector);
    window.onhashchange = () => this.loadContent();
    this.cache = {};
    this.loadContent();
    window.onclick = function(ev){
      if (ev.target.localName === "a" &&
          ev.target.parentNode.localName === "li" &&
          ev.target.parentNode.className.indexOf("tabs-title")>-1
      ){
        document.querySelectorAll("#step-tabs li a").forEach(e=>e.setAttribute("aria-selected", null));
        document.querySelectorAll("#step-tabs li").forEach(e=>e.classList.remove("is-active"));
        ev.target.setAttribute("aria-selected", true);
        ev.target.parentNode.classList.add("is-active");
        document.querySelectorAll("div[data-tabs-content=step-tabs] .tabs-panel").forEach(e=>e.classList.remove("is-active"));
        const target = ev.target.getAttribute("target");
        document.querySelector(target).classList.add("is-active");
      } else if (ev.target.localName === "a" &&
        ev.target.parentNode.localName === "header" &&
        ev.target.parentNode.parentNode.localName === "div" &&
        ev.target.parentNode.parentNode.className.indexOf("genome-property")>-1
      ){
        const expanded =ev.target.parentNode.parentNode.className.indexOf("expanded") > -1;
        if (expanded){
          ev.target.innerHTML = '▸';
          ev.target.parentNode.parentNode.classList.remove("expanded");
        } else {
          ev.target.innerHTML = '▾';
          ev.target.parentNode.parentNode.classList.add("expanded");
        }
      }
    }
  }
  loadContent() {
    switch (location.hash) {
      case "#home": case "":
        this.container.innerHTML = this.getHome();
        break;
      case "#docs":
        this.container.innerHTML = this.getDocs();
        break;
      case "#properties":
        this.container.innerHTML = this.getProps();
        break;
      default:
        if (location.hash.match(/^#GenProp\d{4}$/)){
          this.container.innerHTML = this.getGenProp(location.hash.substr(1));
          return;
        }

        this.container.innerHTML = "404: Not found";
        console.log("other", location.hash);
    }
  }
  embbedInSection(html){
    return `
    <div class="columns">
      <section>
        ${html}
      </section>
    </div>
    `;

  }
  markup2html(txt, key) {
    const converter = new showdown.Converter();
    return converter.makeHtml(txt);
  }
  getResource(key, url, loader){
    if (key in this.cache)
      return this.cache[key];
    fetch(url)
      .then(a=>a.text())
      .then(a=>{
        const html = loader(a);
        this.cache[key] = this.embbedInSection(html);
        this.loadContent();
      })
      .catch(a=>console.error(a));

    return this.embbedInSection('loading...');
  }
  renderGenProp(property){
    return `
    <h2>${property.accession}</h2>
      <h3>${property.name}</h3>
      <span class="tag">${property.type}</span> <span class="tag secondary">Trashhold: ${property.threshold}</span>
      <br/><br/>
      <div class="row">
        <h4>Description</h4>
        <p>${property.description}</p>
      </div>
      <div class="row">
        <h4>Databases</h4>
        <ul>
          ${property.databases.map(db => `
            <li><b>${db.title}</b>: ${db.link}</li>
          `).join('')}
        </ul>
      </div>
      <div class="row">
        <h4>Steps</h4>
        <div class="medium-3 columns">
          <ul class="vertical tabs" data-tabs id="step-tabs">
            ${property.steps.map((step,i) => `
              <li class="tabs-title ${i===0?'is-active':''}">
                <a target="#panel${step.number}" ${i===0?'aria-selected="true"':''}>Step ${step.number}</a>
              </li>
            `).join('')}
          </ul>
        </div>
        <div class="medium-9 columns">
          <div class="tabs-content" data-tabs-content="step-tabs">
          ${property.steps.map((step,i) => `
            <div class="tabs-panel ${i===0?'is-active':''}" id="panel${step.number}">
              <h5>${step.id}</h5>
              <p>Requires Step ${step.requires}</p>
              <table>
                <tr>
                  <th>Evidence</th>
                  <th>Go Terms</th>
                </tr>
                ${step.evidence_list.map((e,i) => `
                  <tr>
                    <td>${e.evidence}</td>
                    <td>${e.go}</td>
                  </tr>
                `).join('')}
              </table>
            </div>
          `).join('')}
          </div>
        </div>
      </div>
      <div class="row">
        <h4>Notes</h4>
        <p>${property.notes}</p>
      </div>
      <div class="row">
        <h4>References</h4>
        <ul>
          ${property.references.map(ref => `
              <li class="reference">
                <span class="index">${ref.number}</span>
                <span class="authors">${ref.author}</span>
                <span class="citation">${ref.title}</span>
                <span class="citation">${ref.citation}</span>
                <span class="reference_id">${ref.PMID}</span>
                <a target="_blank" rel="noopener" href="https://europepmc.org/abstract/MED/${ref.PMID}">EuropePMC</a>
              </li>
          `).join('')}
        </ul>
      </div>

    `;
  }
  renderGenPropHierarchy(hierarchy, expanded=true, level=1){
    return `
    <div class="genome-property ${expanded?'expanded':''}">
      <header>
        ${!hierarchy.children.length?'・':`
        <a style="border: 0;color: darkred;">${expanded?'▾':'▸'}</a>
        `}
        <a href="#${hierarchy.id}">${hierarchy.id}</a>: ${hierarchy.name}
      </header>
      ${!hierarchy.children.length?'':`
        <div class="children" style="
          margin-left: ${level*10}px;
        ">
          ${hierarchy.children
            .map(child => this.renderGenPropHierarchy(child, false, level+1))
            .join('')}
        </div>
      `}
    </div>
    `;
  }
  getGenProp(acc){
    const url = `https://raw.githubusercontent.com/rdfinn/genome-properties/master/data/${acc}/DESC`
    return this.getResource(acc, url, txt => this.renderGenProp(parseGenProp(txt)))
  }
  getHome(){
    return this.getResource('home', 'https://raw.githubusercontent.com/rdfinn/genome-properties/master/docs/background.rst', this.markup2html)
  }
  getDocs(){
    return this.getResource('docs', 'https://raw.githubusercontent.com/rdfinn/genome-properties/master/docs/index.rst', this.markup2html)
  }
  getProps(){
    return this.getResource('props', 'files/gp.primary_dag.txt', txt => {
      return '<h1>Hierarchy</h1>'+this.renderGenPropHierarchy(parseGenPropHierarchy(txt)['GenProp0065'])
      // return `<pre>${JSON.stringify(parseGenPropHierarchy(txt)['GenProp0065'], null, ' ')}</pre>`;
    })
  }
}

export default GenomePropertiesWebsite;
