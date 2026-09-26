import traitNames from './trait-names.json';
import {generateTraits} from './src/generator/generateTraits';
import {TRAIT_DEFINITIONS} from './src/presets/traitDefinitions';
export const catalog=['head','surface','pixelMaterial','eyes'].map(key=>{const d=TRAIT_DEFINITIONS.find(d=>d.key===key)!;return {...d,choices:d.choices.filter(c=>c.id!=='blink').map(c=>({...c,weight:({common:50,uncommon:24,rare:8,legendary:2})[c.tier]}))}});
const colors=[['chrome','Chrome',[.96,.96,.98],35],['graphite','Graphite',[.6,.63,.67],25],['ion','Ion Blue',[.25,.85,1],15],['violet','Ultraviolet',[.75,.45,1],12],['acid','Acid',[.77,1,.25],8],['rose','Rose',[1,.4,.65],8],['copper','Copper',[1,.63,.3],8],['gold','Gilded',[1,.86,.4],2]];
const backgrounds=[['void','Void',[.025,.025,.028],40],['silver','Silver',[.82,.83,.84],25],['cobalt','Cobalt',[.04,.14,.55],15],['wine','Oxblood',[.29,.035,.075],12],['forest','Deep Green',[.025,.22,.16],12],['orchid','Orchid',[.39,.16,.53],7],['orange','Signal Orange',[.85,.25,.055],6],['ice','Ice',[.63,.82,.88],3]];
for(const [key,label,rows] of [['colorway','Colorway',colors],['background','Background',backgrounds]] as any)catalog.push({key,label,choices:rows.map(([id,label,rgb,weight])=>({id,label,rgb,weight,tier:weight>=25?'common':weight>=12?'uncommon':weight>=6?'rare':'legendary'}))} as any);
// Anatomical variation: width, length, forehead, cheekbones and jaw fullness.
const organicHeads=[
 ['balanced','Balanced Oval',30,.128,.174,.02,.02,-.06],
 ['longoval','Long Oval',24,.113,.205,.02,-.03,-.06],
 ['fullcheeks','Full Cheeks',24,.14,.17,-.02,.15,.02],
 ['narrow','Narrow Face',22,.102,.185,.04,-.04,-.12],
 ['broadjaw','Broad Jaw',20,.136,.176,-.04,.01,.23],
 ['taperedjaw','Tapered Jaw',24,.129,.184,.07,.04,-.28],
 ['highforehead','High Forehead',20,.126,.211,.16,-.025,-.12],
 ['softchin','Soft Chin',25,.126,.17,0,.015,.1],
 ['highcheeks','High Cheekbones',20,.131,.183,-.04,.21,-.17],
 ['gaunt','Gaunt',14,.11,.205,.06,-.16,-.13],
 ['roundface','Round Face',24,.153,.165,-.025,.025,.075],
 ['heartface','Heart Face',18,.135,.182,.13,.06,-.3],
 ['pearface','Full Lower Face',16,.135,.176,-.17,.04,.25],
 ['slenderchin','Slender Chin',18,.12,.2,.07,.085,-.25],
 ['heavybrow','Heavy Brow',16,.143,.182,.09,-.05,.075],
 ['compact','Compact Face',22,.133,.153,.01,.04,.03],
 ['widetemple','Wide Temples',18,.145,.183,.19,-.06,-.13],
 ['softlong','Soft Long Face',18,.123,.208,-.04,.02,.14]
];
const heads=catalog.find(d=>d.key==='head');heads.choices=organicHeads.map(([id,label,weight,rx,ry,forehead,cheek,jaw])=>({id,label,weight,tier:Number(weight)>=24?'common':Number(weight)>=18?'uncommon':'rare',params:{headId:id,rx,ry,forehead,cheek,jaw}})) as any;
catalog.push({key:'face',label:'Face Architecture',choices:[['classic','Classic',35],['cyclops','Cyclops',22],['triple','Tri Optic',18],['slit','Narrow Slits',24],['square','Square Optics',25],['cross','Cross Optics',12],['grin','Wide Grin',20],['hollow','Hollow Mask',14]].map(([id,label,weight])=>({id,label,weight,tier:Number(weight)>=24?'common':Number(weight)>=18?'uncommon':'rare',params:{}}))} as any);
for(const d of catalog){d.label=traitNames[d.key].label;for(const c of d.choices)c.label=traitNames[d.key].choices[c.id];}
export function traitsFor(seed,selected){const t=generateTraits(seed);for(const key of ['head','surface','pixelMaterial','eyes']){const c=catalog.find(d=>d.key===key).choices.find(c=>c.id===selected[key]);t.selections[key]={...t.selections[key],choiceId:c.id,choiceLabel:c.label,params:{...c.params}};}for(const [key,id] of Object.entries({body:'standard',pose:'vigil',mutation:'none',palette:'mono',fragmentation:'intact'})){const c=TRAIT_DEFINITIONS.find(d=>d.key===key).choices.find(c=>c.id===id);t.selections[key]={...t.selections[key],choiceId:c.id,choiceLabel:c.label,params:{...c.params}};}(t as any).formFace=selected.face;return t;}
export function select(seed){let a=seed;const r=()=>{a+=0x6D2B79F5;let t=a;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296};return Object.fromEntries(catalog.map(d=>{let n=r()*d.choices.reduce((a,c)=>a+c.weight,0);return[d.key,(d.choices.find(c=>(n-=c.weight)<0)||d.choices.at(-1)).id]}))}
