/******************************************************************************
 *   Copyright 2013 Aleksi Grön                                               *
 *   Copyright 2013 Janne Koski                                               *
 *   Copyright 2013 Tommi Leinamo                                             *
 *   Copyright 2013 Lasse Liehu                                               *
 *                                                                            *
 *   This file is part of SLURP.                                              *
 *                                                                            *
 *   SLURP is free software: you can redistribute it and/or modify it         *
 *   under the terms of the GNU Affero General Public License as              *
 *   published by the Free Software Foundation, either version 3 of           *
 *   the License, or (at your option) any later version.                      *
 *                                                                            *
 *   SLURP is distributed in the hope that it will be useful,                 *
 *   but WITHOUT ANY WARRANTY; without even the implied warranty of           *
 *   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the            *
 *   GNU Affero General Public License for more details.                      *
 *                                                                            *
 *   You should have received a copy of the GNU Affero General Public License *
 *   along with SLURP.  If not, see <http://www.gnu.org/licenses/>.           *
 ******************************************************************************/

Meteor.startup(function () {
  addInitialData();
});

function addInitialData() {
  if (Sites.find().count() === 0) {
    if (Meteor.settings.developmentSettings) {
      addDummyData();
    }

    updateRemoteSites(true);
  }

  if (Categories.find().count() === 0) {
    var categories = [
      {key: 'animal-sports', priority: 3},
      {key: 'cycling', priority: 10},
      {key: 'extreme', priority: 2},
      {key: 'hiking', priority: 7},
      {key: 'indoor', priority: 6},
      {key: 'kids', priority: 4},
      {key: 'running', priority: 11},
      {key: 'water-sports', priority: 9},
      {key: 'winter-sports', priority: 8}
    ];
    for (var i = 0; i < categories.length; ++i) {
      Categories.insert(categories[i]);
    }
  }
}

function addDummyData() {
  var routes = [
    {
      name : 'Suolijärven reitti',
      description : '',
      categories: ['running', 'hiking'],
      routeData : {
        type: 'LineString',
        coordinates: [
          [ 23.826979994773865, 61.441998868246195 ],
          [ 23.8273286819458, 61.44196809482953 ],
          [ 23.827945590019226, 61.4419732237344 ],
          [ 23.82863223552704, 61.442019383840424 ],
          [ 23.82897555828094, 61.442019383840424 ],
          [ 23.83008062839508, 61.44215786374853 ],
          [ 23.83034348487854, 61.44223992562608 ],
          [ 23.830418586730957, 61.44234763151271 ],
          [ 23.83056342601776, 61.442434821719864 ],
          [ 23.830869197845455, 61.44255022014861 ],
          [ 23.83107841014862, 61.4425732997831 ],
          [ 23.831507563591003, 61.442709212839816 ],
          [ 23.832145929336548, 61.44281948148829 ],
          [ 23.832934498786926, 61.442855382824575 ],
          [ 23.83385181427002, 61.442763065019165 ],
          [ 23.83423805236816, 61.44282973901716 ],
          [ 23.834999799728394, 61.4428425609235 ],
          [ 23.83536458015442, 61.44290667037613 ],
          [ 23.83581519126892, 61.44317849299118 ],
          [ 23.836281895637512, 61.443304146040695 ],
          [ 23.836507201194763, 61.44329645301139 ],
          [ 23.837252855300903, 61.44316054251421 ],
          [ 23.839656114578247, 61.44263228099368 ],
          [ 23.840761184692383, 61.44231942286406 ],
          [ 23.840927481651306, 61.442168121495015 ],
          [ 23.84105086326599, 61.441657794514555 ],
          [ 23.841195702552795, 61.44151931238578 ],
          [ 23.841517567634583, 61.44132441057016 ],
          [ 23.841775059700012, 61.4411654108184 ],
          [ 23.841887712478634, 61.44103974915073 ],
          [ 23.84221494197845, 61.44092947420888 ],
          [ 23.842638731002808, 61.4408038115905 ],
          [ 23.842762112617493, 61.440665325669464 ],
          [ 23.842434883117676, 61.44057043681299 ],
          [ 23.842273950576782, 61.44058069508165 ],
          [ 23.842155933380127, 61.440598647043714 ],
          [ 23.841898441314697, 61.440578130514815 ],
          [ 23.841689229011536, 61.440529403704524 ],
          [ 23.841501474380493, 61.44032680194021 ],
          [ 23.841533660888672, 61.440106246624495 ],
          [ 23.841517567634583, 61.439990839151626 ],
          [ 23.841388821601864, 61.43990107748858 ],
          [ 23.840766549110413, 61.43973181193536 ],
          [ 23.839479088783264, 61.43962153236854 ],
          [ 23.83910357952118, 61.43952664033614 ],
          [ 23.837960958480835, 61.43947534722543 ],
          [ 23.835783004760742, 61.43908038744738 ],
          [ 23.83462965488434, 61.43875723481772 ],
          [ 23.833508491516113, 61.438346877446634 ],
          [ 23.833277821540833, 61.43824941677756 ],
          [ 23.833127617836, 61.43822376918246 ],
          [ 23.832886219024658, 61.4382673700816 ],
          [ 23.832714557647705, 61.43829045288587 ],
          [ 23.832215666770935, 61.43842125512075 ],
          [ 23.83182942867279, 61.438598221977145 ],
          [ 23.831394910812378, 61.43868798739004 ],
          [ 23.830456137657162, 61.4387726231141 ],
          [ 23.829662203788757, 61.43896241147858 ],
          [ 23.82936179637909, 61.439052175843266 ],
          [ 23.828964829444885, 61.439159892739845 ],
          [ 23.82774710655212, 61.43979336315191 ],
          [ 23.827226758003235, 61.439877995876344 ],
          [ 23.82634162902832, 61.4399523698991 ],
          [ 23.825359940528866, 61.44022678286242 ],
          [ 23.82503807544708, 61.44071661682304 ],
          [ 23.824485540390015, 61.44094742597019 ],
          [ 23.823793530464172, 61.44111412040295 ],
          [ 23.822688460350037, 61.44125003981945 ],
          [ 23.8223934173584, 61.441242346283396 ],
          [ 23.82199108600616, 61.441329539580934 ],
          [ 23.821454644203186, 61.441629585241884 ],
          [ 23.820295929908752, 61.44210144608242 ],
          [ 23.817683458328247, 61.44306566124994 ],
          [ 23.816755414009094, 61.44372982403707 ],
          [ 23.815237283706665, 61.44426575975662 ],
          [ 23.813998103141785, 61.44453757052436 ],
          [ 23.813289999961853, 61.445152982375035 ],
          [ 23.812238574028015, 61.44700683716544 ],
          [ 23.812227845191956, 61.44742220859997 ],
          [ 23.812372684478756, 61.44753246058221 ],
          [ 23.812565803527832, 61.4476555321019 ],
          [ 23.81285548210144, 61.447647840146146 ],
          [ 23.81312906742096, 61.44757604846766 ],
          [ 23.81362795829773, 61.447337596349165 ],
          [ 23.81413757801056, 61.44722734367781 ],
          [ 23.814722299575806, 61.447158115057 ],
          [ 23.815269470214844, 61.447158115057 ],
          [ 23.81613314151764, 61.447327340303175 ],
          [ 23.816567659378048, 61.447458104636986 ],
          [ 23.817173838615417, 61.447586304431844 ],
          [ 23.817881941795346, 61.447619636292174 ],
          [ 23.818482756614685, 61.44763245622896 ],
          [ 23.81983995437622, 61.44751707660811 ],
          [ 23.82209837436676, 61.44727349600628 ],
          [ 23.822532892227173, 61.44713247478806 ],
          [ 23.822779655456543, 61.44709401434512 ],
          [ 23.823680877685547, 61.44705042578575 ],
          [ 23.824474811553955, 61.44690427546552 ],
          [ 23.82559061050415, 61.44646582039422 ],
          [ 23.82688343524933, 61.44557607097653 ],
          [ 23.827698826789856, 61.44504528617799 ],
          [ 23.827516436576843, 61.44498118112218 ],
          [ 23.82713556289673, 61.44494784644108 ],
          [ 23.82681369781494, 61.44484527796801 ],
          [ 23.826733231544495, 61.444568341405386 ],
          [ 23.82688879966736, 61.444411922445084 ],
          [ 23.82708191871643, 61.443952918015555 ],
          [ 23.82663130760193, 61.443578529511235 ],
          [ 23.826261162757874, 61.443411848251564 ],
          [ 23.826105594635006, 61.443237473057074 ],
          [ 23.82613778114319, 61.443070789974314 ],
          [ 23.825424313545227, 61.44295282910042 ],
          [ 23.82488250732422, 61.44302463142462 ],
          [ 23.825306296348572, 61.442693826485765 ],
          [ 23.825665712356567, 61.4425732997831 ],
          [ 23.8261216878891, 61.44239122664674 ],
          [ 23.826985359191895, 61.442001432696216 ]
        ]
      }
    },
    {
      name: 'Ahvenisjärven kierros',
      description: '',
      categories: ['running', 'hiking'],
      location:
      {
        type: 'Point',
        coordinates: [23.84535095521382, 61.44807302686603]
      },
      routeData : {
        type: 'LineString',
        coordinates: [
          [ 23.84859323501587, 61.44790680161269 ],
          [ 23.848732709884644, 61.448014487925974 ],
          [ 23.84883463382721, 61.44818114458229 ],
          [ 23.848732709884644, 61.44851189130789 ],
          [ 23.848378658294674, 61.448670853601946 ],
          [ 23.84807288646698, 61.44865547018956 ],
          [ 23.84772956371307, 61.44867598140439 ],
          [ 23.847445249557495, 61.44875802612876 ],
          [ 23.84730577468872, 61.4488400706372 ],
          [ 23.846951723098755, 61.44886058173059 ],
          [ 23.84655475616455, 61.44882981508545 ],
          [ 23.846168518066406, 61.448809303971835 ],
          [ 23.845696449279785, 61.448722131588404 ],
          [ 23.845481872558594, 61.4486631618967 ],
          [ 23.84528875350952, 61.44864521457709 ],
          [ 23.845031261444092, 61.44861701162538 ],
          [ 23.844661116600037, 61.44860931990684 ],
          [ 23.84434461593628, 61.44858111692267 ],
          [ 23.84379744529724, 61.44838113139391 ],
          [ 23.84320735931396, 61.4482554988031 ],
          [ 23.84281039237976, 61.44819396428817 ],
          [ 23.842499256134033, 61.4480965343912 ],
          [ 23.842284679412842, 61.44800423210265 ],
          [ 23.842273950576782, 61.44787603402631 ],
          [ 23.84233832359314, 61.447788859033295 ],
          [ 23.842445611953735, 61.447717067679534 ],
          [ 23.842509984970093, 61.447640148188505 ],
          [ 23.842531442642212, 61.44752733259168 ],
          [ 23.842692375183105, 61.447414516586655 ],
          [ 23.84286403656006, 61.44732221227891 ],
          [ 23.843164443969727, 61.447270931989834 ],
          [ 23.843196630477905, 61.447224779657574 ],
          [ 23.84357213973999, 61.44726067592191 ],
          [ 23.844205141067505, 61.447276060022524 ],
          [ 23.844457268714905, 61.447299136159266 ],
          [ 23.8455730676651, 61.44754271656075 ],
          [ 23.846141695976257, 61.447588868422365 ],
          [ 23.846619129180908, 61.447622200279945 ],
          [ 23.847139477729797, 61.447729887576244 ],
          [ 23.847638368606564, 61.44776834723479 ],
          [ 23.84821236133575, 61.44781706273417 ],
          [ 23.84856104850769, 61.44789654575394 ]
        ]
      }
    }
  ];
  for (var i = 0; i < routes.length; ++i) {
    SiteService.insert(routes[i]);
  }
  var places = [
    // Add some dummy places here.
  ];
  for (var i = 0; i < places.length; ++i) {
    SiteService.insert(places[i]);
  }
}
