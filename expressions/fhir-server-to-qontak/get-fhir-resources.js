get(`${state.configuration.resource}/Patient`, {
  query: {
    identifier: 'https://fhir.kemkes.go.id/id/nik|',
    _sort: '_id',
    _count: '1000',
    _offset: state.lastOffset
  },
  headers: {
    'content-type': 'application/json',
    'accept': 'application/fhir+json',
    'Authorization': `${state.configuration.tokenType} ${state.configuration.accessToken}`,
  }
},
  state => {
    if (state.lastOffset === undefined || state.lastOffset === null) {
      state.lastOffset = 0;
    }

    if (state.data.entry !== undefined && state.data.entry !== null) {
      state.lastOffset = state.data.entry.length + state.lastOffset
    } else {
      throw new Error("No data.entry retrieved (no new data)");
    }

    return { data: state.data, lastOffset: state.lastOffset }
  }
);
