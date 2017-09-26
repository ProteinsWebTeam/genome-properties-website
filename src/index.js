import parseGenProp from "./genprop-parser";
import {RstRenderer} from "./rst-renderer";

class GenomePropertiesWebsite {
  constructor(selector) {
    this.selector = selector;
    this.container = document.querySelector(selector);
    this.github = "https://raw.githubusercontent.com/rdfinn/genome-properties/master";
    window.onhashchange = () => this.loadContent();
    this.cache = {};
    this.loadContent();
    window.onclick = function(ev){
      if (location.hash.match(/^#GenProp\d{4}$/) &&
          ev.target.localName === "a" &&
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
    window.onchange = function(ev){
      console.log(ev.target.id);
      if (ev.target.id==='newfile'){

        const oFiles = document.getElementById("newfile").files;
        for (let i=0; i < oFiles.length; i++){
            const reader = new FileReader();
            reader.fileToRead = oFiles[i];
            reader.onload = function(evt) {
              try {
                viewer.load_genome_properties_text(evt.target.fileToRead.name, evt.target.result);
              }catch(e){
                  alert('Bad formatted file');
                  console.error(e);
              }
            };
            reader.readAsText(oFiles[i]);
        }
      }
    }
  }
  markup2html (txt) {
    const renderer = new RstRenderer(this.github, this);
    return renderer.markup2html(txt);
  }
  loadContent(pageRequiredToChange=false,key=null) {
    let content = "";
    switch (location.hash) {
      case "#home": case "":
        content = this.getHome();
        break;
      case "#about":
      case "#calculating":
      case "#documentation":
      case "#funding":
      case "#contributing":
      case "#contact":
        content = this.getAboutTabs();
        break;
      case '#browse':
      case '#hierarchy':
      case '#pathways':
      case '#metapaths':
      case '#systems':
      case '#guilds':
      case '#categories':
        content = this.getBrowseTabs();
        break;
      case "#viewer":
        this.container.innerHTML = this.getViewerHTML();
        this.loadViewer();
        return;
      default:
        const propMatch = location.hash.match(/^#GenProp\d{4}/)
        if (propMatch){
          content = this.getGenProp(propMatch[0].substr(1));
        }else if (pageRequiredToChange){
            content = "404: Not found";
        }// console.log("other", location.hash);
    }
    if (key && key.startsWith("INCLUDE_") && key in this.cache){
      content = content.replace(key, this.markup2html(this.cache[key]));
      this.cache[location.hash] = content;
    }
    this.container.innerHTML = content;
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
  getResource(key, url, loader, template_tag=null,embbedInSection=true){
    if (key in this.cache)
      return this.cache[key];
    fetch(url)
      .then(a=>a.text())
      .then(a=>{
        const html = loader(a);
        this.cache[key] = embbedInSection ? this.embbedInSection(html): html;
        this.loadContent(true, key);
      })
      .catch(a=>console.error(a));
    return template_tag===null ? this.embbedInSection('loading...') : template_tag;
  }
  renderGenProp(property){
    return `
    <h2>${property.accession}</h2>
      <h3>${property.name}</h3>
      <span class="tag">${property.type}</span> <span class="tag secondary">Threshold: ${property.threshold}</span>
      <br/><br/>
      <div>
        <h4>Description</h4>
        <p>${this.renderDescription(property.description, property.accession)}</p>
      </div>
      <div>
        <h4>Steps</h4>
        <table  style="background-color:#86a5bb;">
          <tr>
            <th width="30%">Step</td>
            <th width="65%">Details</td>
          </tr>

          ${property.steps.map((step,i) => `
            <tr>
              <td>${step.number}. ${step.id}</td>
              <td>
              ${step.requires==="1"?'<span class="tag">Required</span>':''}
              <table style="background-color:#fefefe">
                <tr>
                  <th>Evidence</th>
                  <th>Go Terms</th>
                </tr>
                ${step.evidence_list.map((e,i) => `
                  <tr>
                    <td>${this.renderEvidence(e.evidence)}</td>
                    <td>${this.renderEvidence(e.go)}</td>
                  </tr>
                `).join('')}
              </table>
              </td>
            </tr>
          `).join('')}
        </table>
      </div>
      <div>
        <h4>Database Links</h4>
        <ul>
          ${property.databases.map(db => `
            <li>${this.renderDatabaseLink(db.title, db.link)}</li>
          `).join('')}
        </ul>
      </div>
      <div>
        <h4>References</h4>
        <ul class="references">
          ${property.references.map(ref => `
              <li class="reference" id="${property.accession}-${ref.number}">
                <span class="index">[${ref.number}]</span>
                <span class="authors">${ref.author}</span>
                <span class="title">${ref.title}</span>
                <span class="citation">${ref.citation}</span>
                <span class="reference_id">${ref.PMID}</span>
                <a target="_blank" rel="noopener" href="https://europepmc.org/abstract/MED/${ref.PMID}">EuropePMC</a>
              </li>
          `).join('')}
        </ul>
      </div>

    `;
  }
  renderDescription(txt, acc){
    return txt.replace(/\[(\d+)\]/g, `<a href="#${acc}-$1">[$1]</a>`);
  }
  renderDatabaseLink(title, link){
    let a = link;
    const parts = link.split(';').map(p => p.trim());
    if (parts[0] === 'KEGG')
      a = `<a
        href="http://www.genome.jp/dbget-bin/www_bget?pathway:${parts[1]}"
      >KEGG</a>`;
    else if (parts[0] === 'IUBMB')
      a = `<a
        href="http://www.chem.qmul.ac.uk/iubmb/enzyme/reaction/${parts[1]}/${parts[2]}.html"
      >IUBMB</a>`
    else if (parts[0] === 'MetaCyc')
      a = `<a
        href="https://metacyc.org/META/NEW-IMAGE?type=NIL&object=${parts[1]}"
      >MetaCyc</a>`
    return `<b>${title}</b>: ${a}`;
  }
  renderEvidence(txt){
    if (!txt) return '';
    const parts = txt.split(';');
    return parts
      .filter(p => p.trim()!=='')
      .map(t => {
        const term = t.trim();
        if (term.startsWith("GO:"))
          return `<a href="http://www.ebi.ac.uk/QuickGO/GTerm?id=${term}">${term}</a>`
        if (term.startsWith("GenProp"))
          return `<a href="#${term}">${term}</a>`
        if (term.startsWith("IPR"))
          return `<a href="https://www.ebi.ac.uk/interpro/entry/${term}">${term}</a>`
        if (term.startsWith("TIGR"))
          return `<a href="http://www.jcvi.org/cgi-bin/tigrfams/HmmReportPage.cgi?acc=${term}">${term}</a>`
        else {
          return term;
        }
      }).join(' - ')
  }
  renderGenPropHierarchy(hierarchy, expanded=true, level=1){
    // console.log(hierarchy)
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
  getViewerHTML() {
    return `
      <div class="container">
        <div class="top-block">
            <div id="gp-controllers" class="top-controllers">
                <div>
                    <header>Load Genome Properties</header>
                    <ul>
                        <li><label for="tax-search">From Taxonomy:</label>
                            <input type="text" id="tax-search">
                        </li>
                        <li>
                            <label for="newfile">From a File: </label>
                            <input type="file" id="newfile"/>
                        </li>
                    </ul>
                </div>
                <div>
                    <header>Filter Properties</header>
                    <ul>
                        <li><label for="gp-selector">By Top level category:</label>
                            <div id="gp-selector" class="selector"></div>
                        </li>
                        <li><label for="gp-filter">by Text:</label>
                            <input type="text" id="gp-filter">
                        </li>
                    </ul>
                </div>
                <div>
                    <header>Labels</header>
                    <ul>
                      <li><label for="tax_label">Species:</label>
                          <select id="tax_label">
                              <option value="name">Species</option>
                              <option value="id">Tax ID</option>
                              <option value="both">Both</option>
                          </select>
                      </li>
                        <li><label for="gp_label">Properties:</label>
                            <select id="gp_label">
                                <option value="name">Name</option>
                                <option value="id">ID</option>
                                <option value="both">Both</option>
                            </select>
                        </li>
                    </ul>
                </div>
                <div class="gp-legends">
                    <header>Legends</header>
                </div>
                <a class="minimise"></a>
            </div>
        </div>
        <div id="gp-viewer"></div>
        <div class="info-tooltip"></div>
    </div>`
  }
  loadViewer(){
    var d3 = gpv.d3,
            GenomePropertiesViewer = gpv.GenomePropertiesViewer,
            viewer = new GenomePropertiesViewer({
                element_selector: "#gp-viewer",
                controller_element_selector: "#gp-selector",
                server: `${this.github}/docs/release/GP_calculation/SUMMARY_FILE_`,
                hierarchy_path: `${this.github}/docs/release/hierarchy.json`,
                whitelist_path: "https://raw.githubusercontent.com/ProteinsWebTeam/genome-properties-viewer/master/test-files/gp_white_list.json",
                server_tax: `${this.github}/docs/release/taxonomy.json`,
                height: 400
            });
      window.viewer = viewer;
      d3.select(".minimise").on("click",(d,i,c)=>{
          const on = d3.select(c[i]).classed("on");
          d3.selectAll(".top-controllers>div")
                  .style("max-height", on?"0px":"500px")
                  .style("overflow", on?null:"hidden")
                  .transition(200)
                  .style("max-height", on?"500px":"0px")
                  .style("opacity", on?1:0);
          d3.selectAll(".top-controllers").transition(200).style("padding", on?"5px":"0px");
          d3.select(c[i]).classed("on", !on);
      });
  }
  getGenProp(acc){
    const url = `${this.github}/data/${acc}/DESC`
    return this.getResource(acc, url, txt => this.renderGenProp(parseGenProp(txt)))
  }
  getHome(){
    // return this.markup2html(text);
    return this.getResource('#home', `${this.github}/docs/landing.rst?`,this.markup2html.bind(this));
  }
  getAboutTabs() {
    const resource = {
      "#about": '/docs/background.rst',
      "#calculating": '/docs/calculating.rst',
      "#documentation": '/docs/documentation.rst',
      "#funding": '/docs/funding.rst',
      "#contributing": '/docs/contributing.rst',
      "#contact": '/docs/contact.rst',
    };
    const tabs = [
      'About', 'Calculating', 'Funding', 'Contributing', 'Documentation', 'Contact'
    ];
    return this.getContentTabs(resource,tabs,this.markup2html.bind(this));
  }
  getBrowseTabs() {
    const resource = {
      "#pathways": '/docs/_stats/stats.PATHWAY',
      "#metapaths": '/docs/_stats/stats.METAPATH',
      "#systems": '/docs/_stats/stats.SYSTEM',
      "#guilds": '/docs/_stats/stats.GUILD',
      "#categories": '/docs/_stats/stats.CATEGORY',
    };

    const tabs = [
      'Hierarchy', 'Pathways', 'Metapaths',
      'Systems', 'Guilds', 'Categories'
    ];
    return this.getContentTabs(resource,tabs,this.renderStatsFile);
  }
  getContentTabs(resource, tabs, renderer) {
    return `
      <ul class="tabs" data-tabs id="browse-tabs">
      ${tabs.map(tab => {
        const hash = '#'+tab.toLowerCase();
        const isActive = hash === location.hash;
        return `
          <li class="tabs-title ${isActive?'is-active':''}" >
            <a ${isActive?'aria-selected="true"':''} href="${hash}">${tab}</a>
          </li>`;
        }).join('')
      }
      </ul>
      <br/>
      ${
        (location.hash==='#hierarchy' || location.hash==='#browse') ?
          this.getProps() :
          this.getResource(
            location.hash,
            `${this.github}${resource[location.hash]}`,
            renderer
          )
        }
    `
  }
  renderStatsFile(txt){
    return `
    <div id="content-browse-tab">
      <ul>
        ${txt.split('\n').map(line=>{
          if (line.trim()==="") return "";
          const gp =line.split('\t');
          return `
            <li>
              <a href="#${gp[0]}">${gp[0]}</a>: ${gp[1]}
            </li>`
        }).join('')}
      </ul>
    </div>`;
  }
  getProps(){
    return this.getResource('props', `${this.github}/docs/release/hierarchy.json`, txt => {
      return this.renderGenPropHierarchy(JSON.parse(txt))
    })
  }
}

export default GenomePropertiesWebsite;
