// ドット絵アイコン（12×12）。ic('name') で <img> を返す
(function () {
  const P = { k: '#2b2b2b', w: '#ffffff', y: '#f2c94c', o: '#e8913a', r: '#e8546a', g: '#5aa05a', G: '#3f6e51', b: '#4a90d9', B: '#1f3a5f', n: '#8b5a2b', s: '#e3cfa0', l: '#cfd8dc', d: '#8a969c', p: '#e79bb8' };
  const S = {
    home: ['.....kk.....', '....kook....', '...kooook...', '..kooooook..', '.kooooooook.', 'kkkkkkkkkkkk', '.kwwwwwwwwk.', '.kwbbwwnnwk.', '.kwbbwwnnwk.', '.kwwwwwnnwk.', '.kwwwwwnnwk.', '.kkkkkkkkkk.'],
    map: ['............', 'kkkkkkkkkkkk', 'kgggyyybbbbk', 'kggyyyybbbbk', 'kgyyyrybbbbk', 'kgyyrrrybbbk', 'kggyyryybbbk', 'kgggyyybbgbk', 'kbggggyyggbk', 'kbbgggggyggk', 'kkkkkkkkkkkk', '............'],
    loop: ['....bbbb....', '..bbbbbbbbb.', '.bb.....bbb.', '.b.....bbbb.', 'bb..........', 'b..........b', 'b..........b', '..........bb', '.bbbb.....b.', '.bbb.....bb.', '.bbbbbbbbb..', '....bbbb....'],
    calc: ['.kkkkkkkkkk.', '.kBBBBBBBBk.', '.kBggggggBk.', '.kBggggggBk.', '.kBBBBBBBBk.', '.kBwBwBwBBk.', '.kBBBBBBBBk.', '.kBwBwBwBBk.', '.kBBBBBBBBk.', '.kBwBwBrrBk.', '.kBBBBBBBBk.', '.kkkkkkkkkk.'],
    gear: ['....dddd....', '.dd.dddd.dd.', '.dddddddddd.', '..ddd..ddd..', 'dddd....dddd', 'ddd......ddd', 'ddd......ddd', 'dddd....dddd', '..ddd..ddd..', '.dddddddddd.', '.dd.dddd.dd.', '....dddd....'],
    cloud: ['............', '............', '....bbb.....', '...bbbbb....', '..bbbbbbbb..', '.bbbbbbbbbb.', 'bbbbbbbbbbbb', 'bbbbbbbbbbbb', '.bbbbbbbbbb.', '............', '............', '............'],
    cricket: ['............', 'n.........n.', '.n.......n..', '..n.....n...', '...nnnnnnk..', '..nnnnnnnnk.', '.nnnnnnnnnn.', 'nnnnnnnnnn..', '..n..n..n...', '.n...n...n..', 'n....n....n.', '............'],
    check: ['GGGGGGGGGGGG', 'GggggggggggG', 'GggggggggwgG', 'GgggggggwwgG', 'GggggggwwggG', 'GgwgggwwgggG', 'GgwwgwwggggG', 'GggwwwgggggG', 'GgggwggggggG', 'GggggggggggG', 'GggggggggggG', 'GGGGGGGGGGGG'],
    book: ['............', '.BBBB..BBBB.', 'BwwwwBBwwwwB', 'BwllwBBwllwB', 'BwwwwBBwwwwB', 'BwllwBBwllwB', 'BwwwwBBwwwwB', 'BwllwBBwllwB', 'BwwwwBBwwwwB', 'BBBBBBBBBBBB', '.....BB.....', '............'],
    trophy: ['..yyyyyyyy..', 'yyyyyyyyyyoy', 'y.yyyyyyyo.y', 'y.yyyyyyyo.y', '.yyyyyyyyoy.', '...yyyyyo...', '....yyyo....', '.....yo.....', '.....yo.....', '....yyyo....', '...nnnnnn...', '...nnnnnn...'],
    play: ['............', '..b.........', '..bbb.......', '..bbbbb.....', '..bbbbbbb...', '..bbbbbbbbb.', '..bbbbbbbbb.', '..bbbbbbb...', '..bbbbb.....', '..bbb.......', '..b.........', '............'],
    lock: ['....dddd....', '...d....d...', '..d......d..', '..d......d..', '..d......d..', '.yyyyyyyyyy.', '.yyyyyyyyyy.', '.yyyykkyyyy.', '.yyyykkyyyy.', '.yyyyykyyyy.', '.yyyyyyyyyy.', '.oooooooooo.'],
    crown: ['............', '............', 'y....yy....y', 'yy..yyyy..yy', 'yyy.yyyy.yyy', 'yyyyyyyyyyyy', 'yyryyyyyyryy', 'yyyyyyyyyyyy', 'oooooooooooo', '............', '............', '............'],
    sprout: ['............', '.gg.....gg..', 'gggg...gggg.', 'ggggg.ggggg.', '.gggg.gggg..', '..ggggggg...', '.....g......', '.....g......', '.....g......', '...nnnnn....', '..nnnnnnn...', '............'],
    pencil: ['.........rr.', '........rrrr', '.......yyrr.', '......yyyy..', '.....yyyy...', '....yyyy....', '...yyyy.....', '..yyyy......', '.ssyy.......', '.sss........', 'kss.........', 'kk..........'],
    sun: ['.....oo.....', '.o...oo...o.', '..o......o..', '....yyyy....', '...yyyyyy...', 'oo.yyyyyy.oo', 'oo.yyyyyy.oo', '...yyyyyy...', '....yyyy....', '..o......o..', '.o...oo...o.', '.....oo.....'],
    fire: ['.....r......', '....rr......', '....rrr..r..', '...rrrr.rr..', '..rrrorrrr..', '..rrooorrrr.', '.rrroooorrr.', '.rrooyyoorr.', '.rrooyyyorr.', '..rooyyyor..', '...rooyor...', '....rrrr....'],
    bar: ['............', '........bb..', '........bb..', '....gg..bb..', '....gg..bb..', '....gg..bb..', 'rr..gg..bb..', 'rr..gg..bb..', 'rr..gg..bb..', 'rr..gg..bb..', 'dddddddddddd', '............'],
    line: ['d...........', 'd.........r.', 'd........r..', 'd...r...r...', 'd..r.r.r....', 'd.r...r.....', 'dr..........', 'd...........', 'd...........', 'd...........', 'dddddddddddd', '............'],
    flag: ['nn..........', 'nnrrrrrrr...', 'nnrrrrrrrr..', 'nnrrwrrrrrr.', 'nnrrrrrrrr..', 'nnrrrrrrr...', 'nn..........', 'nn..........', 'nn..........', 'nn..........', 'nn..........', 'nnnn........'],
    books: ['............', 'rr.bb.......', 'rr.bb.gg.pp.', 'rr.bb.gg.pp.', 'rr.bb.gg.pp.', 'yy.yy.yy.yy.', 'rr.bb.gg.pp.', 'rr.bb.gg.pp.', 'rr.bb.gg.pp.', 'nnnnnnnnnnnn', 'n..........n', '............'],
    tools: ['............', '....kkkk....', '....k..k....', 'rrrrrrrrrrrr', 'rrrrrrrrrrrr', 'rrrrkkkkrrrr', 'rrrrkyykrrrr', 'rrrrrrrrrrrr', 'rrrrrrrrrrrr', 'rrrrrrrrrrrr', 'oooooooooooo', '............'],
    folder: ['............', 'kkkk........', 'kyyyk.......', 'kyyyykkkkkkk', 'kyyyyyyyyyyk', 'kooooooooook', 'kyyyyyyyyyyk', 'kyyyyyyyyyyk', 'kyyyyyyyyyyk', 'kyyyyyyyyyyk', 'kkkkkkkkkkkk', '............'],
    dice: ['............', '.kkkkkkkkkk.', '.kwwwwwwwwk.', '.kwrrwwwwwk.', '.kwrrwwwwwk.', '.kwwwrrwwwk.', '.kwwwrrwwwk.', '.kwwwwwrrwk.', '.kwwwwwrrwk.', '.kwwwwwwwwk.', '.kkkkkkkkkk.', '............'],
    cushion: ['............', '..pppppppp..', '.pppppppppp.', 'ppwppppppppp', 'pppppwpppppp', 'pppppppppwpp', 'ppppwppppppp', 'pppppppwpppp', 'ppwppppppppp', '.pppppppppp.', '..pppppppp..', '............'],
    sparkle: ['......y.....', '......y.....', '.....yyy....', '..yyyyyyyyy.', '.....yyy....', '......y.....', '......y.....', '..y.........', '.yyy........', '..y.........', '............', '............'],
    meat: ['............', '......nnnn..', '.....nnnnnn.', '....nnrnnnn.', '...nnrnnnnn.', '..nnnnnnnn..', '..wnnnnnn...', '.ww.nnnn....', 'ww..........', 'www.........', '.w..........', '............'],
    question: ['....dddd....', '...dd..dd...', '...dd..dd...', '.......dd...', '......dd....', '.....dd.....', '.....dd.....', '............', '.....dd.....', '.....dd.....', '............', '............'],
    music: ['............', '....yyyyyyy.', '....yyyyyyy.', '....y.....y.', '....y.....y.', '....y.....y.', '....y.....y.', '..yyy...yyy.', '.yyyy..yyyy.', '.yyy...yyy..', '............', '............'],
    calendar: ['..k.....k...', '.rrrrrrrrrr.', '.rrkrrrrkrr.', '.wwwwwwwwww.', '.wkwkwkwkww.', '.wwwwwwwwww.', '.wkwkwkwkww.', '.wwwwwwwwww.', '.wkwkwkwwww.', '.wwwwwwwwww.', '.dddddddddd.', '............'],
    disk: ['bbbbbbbbbbb.', 'bbllllllbdbb', 'bbllllllbdbb', 'bbllllllbbbb', 'bbbbbbbbbbbb', 'bbbbbbbbbbbb', 'bwwwwwwwwwwb', 'bwkkkkkkkkwb', 'bwwwwwwwwwwb', 'bwkkkkkkkkwb', 'bwwwwwwwwwwb', 'bbbbbbbbbbbb']
  };
  const cache = {};
  function url(name) {
    if (name === 'gecko') return window.KIKO ? KIKO.png.tiny.mini : '';
    if (cache[name]) return cache[name];
    const rows = S[name]; if (!rows) return '';
    const k = 4, c = document.createElement('canvas'); c.width = c.height = 12 * k;
    const x = c.getContext('2d');
    rows.forEach((r, y) => [...r].forEach((ch, i) => { if (P[ch]) { x.fillStyle = P[ch]; x.fillRect(i * k, y * k, k, k); } }));
    return (cache[name] = c.toDataURL('image/png'));
  }
  window.ic = (name, cls) => `<img class="ic${cls ? ' ' + cls : ''}" src="${url(name)}" alt="">`;
})();
