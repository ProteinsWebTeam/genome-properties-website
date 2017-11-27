class GenPropRenderer {
  renderGenProp(property){
    const isCategory = property.type === 'CATEGORY';
    return `
      <h2>${property.accession} - ${property.name}</h2>
      <span class="tag">Category: ${property.type}</span>
      <br/><br/>
      <div>Author: ${property.author}</div>
      <br/>
      <div>
        <h4>Description</h4>
        <p>${this.renderDescription(property.description, property.accession)}</p>
      </div>
      <div>
        <h4>References</h4>
        ${property.references && property.references.length ?
          this.renderReferences(property.references, property.accession) :
          '<cite>None</cite>'
        }
      </div>
      <div>
        ${isCategory ? this.renderChildren(property) : this.renderSteps(property)}
      </div>
      <div>
        <h4>Database Links</h4>
        ${property.references && property.references.length ? `
          <ul>
            ${property.databases.map(db => `
              <li>${this.renderDatabaseLink(db.title, db.link)}</li>
            `).join('')}
          </ul>
          ` : '<cite>None</cite>'
        }
      </div>
    `;
  }
  renderDescription(txt, acc){
    return txt.replace(/\[(\d+)\]/g, `<a href="#${acc}-$1">[$1]</a>`);
  }
  renderReferences(references, accession){
    return `
      <ul class="references">
        ${references.map(ref => `
            <li class="reference" id="${accession}-${ref.number}">
              <span class="index">[${ref.number}]</span>
              <span class="authors">${ref.author}</span>
              <span class="title">${ref.title}</span>
              <span class="citation">${ref.citation}</span>
              <span class="reference_id">${ref.PMID}</span>
              <a target="_blank" rel="noopener" href="https://europepmc.org/abstract/MED/${ref.PMID}">EuropePMC</a>
            </li>
        `).join('')}
      </ul>
    `;
  }
  renderChildren(property){
    return `
    <div>
      <table class="no-stripe" style=" background-color:#86a5bb;">
        <tr style="background-color: #ddd">
          <th width="30%">Property</td>
          <th style="text-align: left;">'Accession'</th>
        </tr>

        ${property.steps.map((step,j) => `
          <tr style="background-color: ${j%2==0?"white":"#eee"}">
            <td rowspan="${step.evidence_list.length}">
              ${step.number}. ${this.getFirstEvidenceLink(step.evidence_list, step.id)}
              ${step.requires==="1"?'<br/><span class="tag">Required</span>':''}
            </td>
              ${step.evidence_list.map((e,i) => `
                ${i>0?`<tr style="background-color: ${j%2==0?"white":"#eee"}">`:""}
                  <td>${this.renderEvidence(e.evidence)}</td>
                ${i>0?"</tr>":""}
              `).join('')}
          </tr>
        `).join('')}
      </table>
    </div>
    `;
  }
  renderSteps(property){
    return `
    <div>
      <h4>Steps</h4>
      <table class="no-stripe" style=" background-color:#86a5bb;">
        <tr style="background-color: #ddd">
          <th width="30%">Step</td>
          <th style="text-align: left;">Evidence</th>
          <th style="text-align: left;">Go Terms</th>
        </tr>

        ${property.steps.map((step,j) => `
          <tr style="background-color: ${j%2==0?"white":"#eee"}">
            <td rowspan="${step.evidence_list.length}">${step.number}. ${step.id}
              ${step.requires==="1"?'<br/><span class="tag">Required</span>':''}
            </td>
              ${step.evidence_list.map((e,i) => `
                ${i>0?`<tr style="background-color: ${j%2==0?"white":"#eee"}">`:""}
                  <td>${this.renderEvidence(e.evidence)}</td>
                  <td>${this.renderEvidence(e.go)}</td>
                ${i>0?"</tr>":""}
              `).join('')}
          </tr>
        `).join('')}
      </table>
      <span
        data-tooltip
        aria-haspopup="true"
        data-disable-hover="false"
        class="has-tip tag secondary"
        title="Required to pass a step"
      >
          Threshold: ${property.threshold}
      </span>
    </div>
    `;
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
  getFirstEvidenceLink(evidence_list, text){
    if (evidence_list && evidence_list.length) {
      const gp = evidence_list[0].evidence.trim().replace(';', '');
      return `<a href="#${gp}">${text}</a>`;
    }
    return '';
  }
  renderEvidence(txt){
    if (!txt) return '<cite>None</cite>';
    const parts = txt.split(';');
    return parts
      .filter(p => p.trim()!=='' && p.trim()!=='sufficient')
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
}

export default GenPropRenderer;
