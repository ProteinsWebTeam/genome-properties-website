class ViewerRenderer {
  constructor(github) {
    this.github = github;
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
                        <li><button id="toggle-tax" class="button secondary">
                          Show Taxonomy
                        </button>
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
      let showTaxonomy = false;

      viewer.gp_taxonomy.show_tree = showTaxonomy;

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
      d3.select("#toggle-tax").on("click",(d,i,c)=>{
          d3.select(c[i]).text(showTaxonomy ? "Show Taxonomy" : "Hide Taxonomy");
          showTaxonomy = !showTaxonomy;
          viewer.gp_taxonomy.show_tree = showTaxonomy;
          viewer.update_viewer();
      });
  }
}
export default ViewerRenderer;
