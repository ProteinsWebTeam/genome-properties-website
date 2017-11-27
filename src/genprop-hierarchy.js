export const expandElement = element => {
  element.innerHTML = '▾';
  if (element.parentNode.parentNode)
    element.parentNode.parentNode.classList.add("expanded");
}
export const collapseElement = element => {
  element.innerHTML = '▸';
  element.parentNode.parentNode.classList.remove("expanded");
}
export const searchHierarchy = term => {
  document.querySelectorAll(".genome-property a.expander")
    .forEach(e => collapseElement(e));
  document.querySelectorAll('span.genprop-label')
    .forEach(e => e.classList.remove("search-match"));
  if (term.trim()!=='')
    document.querySelectorAll(`span.genprop-label[text*=${term}]`)
      .forEach(e => {
        e.classList.add("search-match");
        expandParents(e.parentNode.parentNode);
      });
}
export const expandParents = element => {
  if (element.parentNode.parentNode.classList.contains('genome-property')){
    element.parentNode.parentNode.classList.add("expanded");
    expandParents(element.parentNode.parentNode);
  }
}
export const renderGenPropHierarchy = (hierarchy, expanded=true, level=1) => {
  // console.log(hierarchy)
  return `
  <div class="genome-property ${expanded?'expanded':''}">
    <header>
      ${!hierarchy.children.length?'・':`
      <a style="border: 0;color: darkred;" class="expander">${expanded?'▾':'▸'}</a>
      `}
      <span class="genprop-label" text="${hierarchy.id} ${hierarchy.name}">
        <a href="#${hierarchy.id}">${hierarchy.id}</a>:
        ${hierarchy.name}
      </span>
    </header>
    ${!hierarchy.children.length?'':`
      <div class="children" style="
        margin-left: ${level*10}px;
      ">
        ${hierarchy.children
          .map(child => renderGenPropHierarchy(child, false, level+1))
          .join('')}
      </div>
    `}
  </div>
  `;
}
export const renderGenPropHierarchyPage = (txt) => {
  let payload = `<div>
                  <input type="text" id="genprop-searcher" placeholder="Search" />
                  <a class="expand-all">Expand All</a> |
                  <a class="collapse-all">Collapse All</a>
                </<div><br/><br/>`;
  payload += renderGenPropHierarchy(JSON.parse(txt));
  return payload;
}
