const parseGenPropHierarchy = (txt) => {
  const hierarchy = {};
  txt.split('\n').forEach(line => {
    const parts = line.split('\t');
    if (parts[0].trim() !== '') {
      if (!(parts[0] in hierarchy))
        hierarchy[parts[0]] = {
          id: parts[0],
          name: parts[1],
          // parents: [],
          children: [],
        }
      if (!(parts[2] in hierarchy))
        hierarchy[parts[2]] = {
          id: parts[2],
          name: parts[3],
          // parents: [],
          children: [],
      }
      hierarchy[parts[0]].children.push(hierarchy[parts[2]])
    }
  });
  return hierarchy;
}

export default parseGenPropHierarchy;
