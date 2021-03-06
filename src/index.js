import parseGenProp from "./genprop-parser";
import { RstRenderer } from "./rst-renderer";
import {
  renderGenPropHierarchyPage,
  expandElement,
  collapseElement,
  searchHierarchy
} from "./genprop-hierarchy";
import GenPropRenderer from "./genprop-property";
import ViewerRenderer from "./genprop-viewer";

function isIpproLine(line) {
  const parts = line.split("\t");
  return !(parts.length < 11 || parts[1].length !== 32);
}

class GenomePropertiesWebsite {
  constructor(selector, options) {
    this.selector = selector;
    this.container = document.querySelector(selector);
    this.github =
      options.content_url ||
      "https://raw.githubusercontent.com/ebi-pf-team/genome-properties/master";
    const gp_server = options.cgi_url || "http://localhost/cgi-bin/test.pl";
    window.onhashchange = () => this.loadContent();
    this.cache = {};
    this.propertyRenderer = new GenPropRenderer();
    this.viewerRenderer = new ViewerRenderer(this.github, options.viewer);
    this.loadContent();

    window.onclick = function(ev) {
      if (
        location.hash.match(/^#GenProp\d{4}$/) &&
        ev.target.localName === "a" &&
        ev.target.parentNode.localName === "li" &&
        ev.target.parentNode.className.indexOf("tabs-title") > -1
      ) {
        document
          .querySelectorAll("#step-tabs li a")
          .forEach(e => e.setAttribute("aria-selected", null));
        document
          .querySelectorAll("#step-tabs li")
          .forEach(e => e.classList.remove("is-active"));
        ev.target.setAttribute("aria-selected", true);
        ev.target.parentNode.classList.add("is-active");
        document
          .querySelectorAll("div[data-tabs-content=step-tabs] .tabs-panel")
          .forEach(e => e.classList.remove("is-active"));
        const target = ev.target.getAttribute("target");
        document.querySelector(target).classList.add("is-active");
      } else if (
        ev.target.localName === "a" &&
        ev.target.parentNode.localName === "header" &&
        ev.target.parentNode.parentNode.localName === "div" &&
        ev.target.parentNode.parentNode.className.indexOf("genome-property") >
          -1
      ) {
        const expanded =
          ev.target.parentNode.parentNode.className.indexOf("expanded") > -1;
        if (expanded) {
          collapseElement(ev.target);
        } else {
          expandElement(ev.target);
        }
      } else if (
        ev.target.localName === "a" &&
        ev.target.className.indexOf("expand-all") > -1
      ) {
        document
          .querySelectorAll(".genome-property a.expander")
          .forEach(e => expandElement(e));
      } else if (
        ev.target.localName === "a" &&
        ev.target.className.indexOf("collapse-all") > -1
      ) {
        document
          .querySelectorAll(".genome-property a.expander")
          .forEach(e => collapseElement(e));
      }
    };
    window.onchange = function(ev) {
      if (ev.target.id === "newfile") {
        const oFiles = document.getElementById("newfile").files;
        for (let i = 0; i < oFiles.length; i++) {
          const reader = new FileReader();
          reader.fileToRead = oFiles[i];
          reader.onload = function(evt) {
            try {
              const firstline = evt.target.result.split("\n")[0];
              if (isIpproLine(firstline)) {
                viewer.modal.showContent(
                  "<h3><div class='loading'>◉</div>Calculation Genome Properties from InterProScan Data</h3>",
                  true
                );
                fetch(gp_server, {
                  method: "POST",
                  body:
                    "ipproname=" +
                    reader.fileToRead.name +
                    "&ipprotsv=" +
                    evt.target.result,
                  headers: new Headers({
                    "Content-Type": "application/x-www-form-urlencoded",
                    "Access-Control-Request-Method": "POST",
                    "Access-Control-Request-Headers":
                      "X-PINGOTHER, Content-Type"
                  })
                })
                  .then(response => response.text())
                  .then(x => {
                    viewer.loadGenomePropertiesText(reader.fileToRead.name, x);
                    viewer.modal.setVisibility(false);
                  });
              } else {
                viewer.loadGenomePropertiesText(
                  reader.fileToRead.name,
                  evt.target.result
                );
              }
            } catch (e) {
              alert("Bad formatted file");
              console.error(e);
            }
          };
          reader.readAsText(oFiles[i]);
        }
      }
    };
  }
  markup2html(txt) {
    const renderer = new RstRenderer(this.github, this);
    return renderer.markup2html(txt);
  }
  loadContent(pageRequiredToChange = false, key = null) {
    let content = "";
    switch (location.hash) {
      case "#home":
      case "":
        content = this.getHome();
        break;
      case "#about":
      case "#calculating":
      case "#documentation":
      case "#funding":
      case "#contributing":
      case "#contact":
      case "#release_notes":
        content = this.getAboutTabs();
        break;
      case "#browse":
      case "#hierarchy":
      case "#pathways":
      case "#metapaths":
      case "#systems":
      case "#guilds":
      case "#categories":
      case "#complexes":
        content = this.getBrowseTabs();
        break;
      case "#viewer":
      case "#instructions":
      case "#species":
        content = this.getViewerTabs();
        break;
      default:
        const propMatch = location.hash.match(/^#GenProp\d{4}/);
        if (propMatch) {
          content = this.getGenProp(propMatch[0].substr(1));
        } else if (pageRequiredToChange) {
          content = "404: Not found";
        }
    }
    if (key && key.startsWith("INCLUDE_") && key in this.cache) {
      content = content.replace(key, this.markup2html(this.cache[key]));
      this.cache[location.hash] = content;
    }
    if (location.hash === "#viewer") {
      this.container.innerHTML = content + this.viewerRenderer.getViewerHTML();
      this.viewerRenderer.loadViewer();
    } else {
      this.container.innerHTML = content;
    }

    $(".has-tip").foundation();

    let timeoutID = null;
    $("#genprop-searcher").on("input", function(e) {
      if (timeoutID != null) window.clearTimeout(timeoutID);
      const term = $(this).val();
      timeoutID = window.setTimeout(() => searchHierarchy(term), 500);
    });
  }
  embbedInSection(html) {
    return `
    <div class="columns">
      <section>
        ${html}
      </section>
    </div>
    `;
  }
  getResource(key, url, loader, template_tag = null, embbedInSection = true) {
    if (key in this.cache) return this.cache[key];
    fetch(url)
      .then(a => a.text())
      .then(a => {
        const html = loader(a);
        this.cache[key] = embbedInSection ? this.embbedInSection(html) : html;
        this.loadContent(true, key);
      })
      .catch(a => console.error(a));
    return template_tag === null
      ? this.embbedInSection("loading...")
      : template_tag;
  }
  getGenProp(acc) {
    const base = `${this.github}/data/${acc}/`;
    return this.getResource(acc, base + "status", text => {
      if (text.indexOf("public:\t1") >= 0) {
        return this.getResource(acc, base + "DESC", txt =>
          this.propertyRenderer.renderGenProp(parseGenProp(txt))
        );
      } else {
        return "The selected property does not exist.";
      }
    });
  }
  getHome() {
    // return this.markup2html(text);
    return this.getResource(
      "#home",
      `${this.github}/docs/landing.rst?`,
      text => {
        let output = this.markup2html(text);
        return output.replace(
          "<table ",
          '<table style="width:  100%; text-align:  center;"'
        );
      }
    );
  }
  getAboutTabs() {
    const resource = {
      "#about": "/docs/background.rst",
      "#calculating": "/docs/calculating.rst",
      "#documentation": "/docs/documentation.rst",
      "#funding": "/docs/funding.rst",
      "#contributing": "/docs/contributing.rst",
      "#contact": "/docs/contact.rst",
      "#release_notes": "/docs/release_notes.rst"
    };
    const tabs = [
      "About",
      "Calculating",
      "Funding",
      "Contributing",
      "Help & Documentation",
      "Contact",
      "Release notes"
    ];
    return this.getContentTabs(resource, tabs, this.markup2html.bind(this));
  }
  getBrowseTabs() {
    const resource = {
      "#pathways": "/docs/_stats/stats.PATHWAY",
      "#metapaths": "/docs/_stats/stats.METAPATH",
      "#systems": "/docs/_stats/stats.SYSTEM",
      "#guilds": "/docs/_stats/stats.GUILD",
      "#categories": "/docs/_stats/stats.CATEGORY",
      "#complexes": "/docs/_stats/stats.COMPLEX"
    };

    const tabs = [
      "Hierarchy",
      "Pathways",
      "Metapaths",
      "Systems",
      "Guilds",
      "Complexes",
      "Categories"
    ];
    return this.getContentTabs(resource, tabs, this.renderStatsFile);
  }
  getViewerTabs() {
    const resource = {
      "#instructions": "/docs/viewer_Instructions.rst",
      "#species": "/docs/species.rst"
    };

    const tabs = ["Viewer", "Instructions", "Species"];
    return this.getContentTabs(resource, tabs, this.markup2html.bind(this));
  }
  getContentTabs(resource, tabs, renderer) {
    let body = '';
    if (location.hash !== "#viewer") {
      body = location.hash === "#hierarchy" || location.hash === "#browse"
      ? this.getProps()
      : this.getResource(
          location.hash,
          `${this.github}${resource[location.hash]}`,
          renderer
        )
    }
    return `
      <ul class="tabs" data-tabs id="browse-tabs">
      ${tabs
        .map(tab => {
          const hash =
            tab.indexOf("&") === -1
              ? "#" + tab.toLowerCase().replace(" ", "_")
              : "#documentation";
          const isActive = hash === location.hash;
          return `
          <li class="tabs-title ${isActive ? "is-active" : ""}" >
            <a ${
              isActive ? 'aria-selected="true"' : ""
            } href="${hash}">${tab}</a>
          </li>`;
        })
        .join("")}
      </ul>
      <br/>
      ${body}
    `;
  }
  renderStatsFile(txt) {
    return `
    <div id="content-browse-tab">
      <ul>
        ${txt
          .split("\n")
          .map(line => {
            if (line.trim() === "") return "";
            const gp = line.split("\t");
            return `
            <li>
              <a href="#${gp[0]}">${gp[0]}</a>:
              <a href="#${gp[0]}">${gp[1]}</a>
            </li>`;
          })
          .join("")}
      </ul>
    </div>`;
  }
  getProps() {
    return this.getResource(
      "props",
      `${this.github}/flatfiles/hierarchy.json`,
      txt => {
        return renderGenPropHierarchyPage(txt);
      }
    );
  }
}

export default GenomePropertiesWebsite;
