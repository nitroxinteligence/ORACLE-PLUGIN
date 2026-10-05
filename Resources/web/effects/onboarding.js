(()=>{var mm=Object.create;var{getPrototypeOf:vm,defineProperty:Xc,getOwnPropertyNames:hm}=Object;var ym=Object.prototype.hasOwnProperty;function gm(e){return this[e]}var wm,km,In=(e,n,r)=>{var l=e!=null&&typeof e==="object";if(l){var t=n?wm??=new WeakMap:km??=new WeakMap,u=t.get(e);if(u)return u}r=e!=null?mm(vm(e)):{};let i=n||!e||!e.__esModule?Xc(r,"default",{value:e,enumerable:!0}):r;for(let o of hm(e))if(!ym.call(i,o))Xc(i,o,{get:gm.bind(e,o),enumerable:!0});if(l)t.set(e,i);return i};var Rn=(e,n)=>()=>(n||e((n={exports:{}}).exports,n),n.exports);var ca=Rn((K)=>{var Hl=Symbol.for("react.element"),Sm=Symbol.for("react.portal"),Em=Symbol.for("react.fragment"),Cm=Symbol.for("react.strict_mode"),Nm=Symbol.for("react.profiler"),Pm=Symbol.for("react.provider"),_m=Symbol.for("react.context"),zm=Symbol.for("react.forward_ref"),Lm=Symbol.for("react.suspense"),xm=Symbol.for("react.memo"),Tm=Symbol.for("react.lazy"),qc=Symbol.iterator;function Dm(e){if(e===null||typeof e!=="object")return null;return e=qc&&e[qc]||e["@@iterator"],typeof e==="function"?e:null}var na={isMounted:function(){return!1},enqueueForceUpdate:function(){},enqueueReplaceState:function(){},enqueueSetState:function(){}},ra=Object.assign,la={};function Zr(e,n,r){this.props=e,this.context=n,this.refs=la,this.updater=r||na}Zr.prototype.isReactComponent={};Zr.prototype.setState=function(e,n){if(typeof e!=="object"&&typeof e!=="function"&&e!=null)throw Error("setState(...): takes an object of state variables to update or a function which returns an object of state variables.");this.updater.enqueueSetState(this,e,n,"setState")};Zr.prototype.forceUpdate=function(e){this.updater.enqueueForceUpdate(this,e,"forceUpdate")};function ta(){}ta.prototype=Zr.prototype;function Bi(e,n,r){this.props=e,this.context=n,this.refs=la,this.updater=r||na}var Wi=Bi.prototype=new ta;Wi.constructor=Bi;ra(Wi,Zr.prototype);Wi.isPureReactComponent=!0;var bc=Array.isArray,ua=Object.prototype.hasOwnProperty,$i={current:null},ia={key:!0,ref:!0,__self:!0,__source:!0};function oa(e,n,r){var l,t={},u=null,i=null;if(n!=null)for(l in n.ref!==void 0&&(i=n.ref),n.key!==void 0&&(u=""+n.key),n)ua.call(n,l)&&!ia.hasOwnProperty(l)&&(t[l]=n[l]);var o=arguments.length-2;if(o===1)t.children=r;else if(1<o){for(var s=Array(o),c=0;c<o;c++)s[c]=arguments[c+2];t.children=s}if(e&&e.defaultProps)for(l in o=e.defaultProps,o)t[l]===void 0&&(t[l]=o[l]);return{$$typeof:Hl,type:e,key:u,ref:i,props:t,_owner:$i.current}}function Im(e,n){return{$$typeof:Hl,type:e.type,key:n,ref:e.ref,props:e.props,_owner:e._owner}}function Ai(e){return typeof e==="object"&&e!==null&&e.$$typeof===Hl}function Rm(e){var n={"=":"=0",":":"=2"};return"$"+e.replace(/[=:]/g,function(r){return n[r]})}var ea=/\/+/g;function Hi(e,n){return typeof e==="object"&&e!==null&&e.key!=null?Rm(""+e.key):n.toString(36)}function tu(e,n,r,l,t){var u=typeof e;if(u==="undefined"||u==="boolean")e=null;var i=!1;if(e===null)i=!0;else switch(u){case"string":case"number":i=!0;break;case"object":switch(e.$$typeof){case Hl:case Sm:i=!0}}if(i)return i=e,t=t(i),e=l===""?"."+Hi(i,0):l,bc(t)?(r="",e!=null&&(r=e.replace(ea,"$&/")+"/"),tu(t,n,r,"",function(c){return c})):t!=null&&(Ai(t)&&(t=Im(t,r+(!t.key||i&&i.key===t.key?"":(""+t.key).replace(ea,"$&/")+"/")+e)),n.push(t)),1;if(i=0,l=l===""?".":l+":",bc(e))for(var o=0;o<e.length;o++){u=e[o];var s=l+Hi(u,o);i+=tu(u,n,r,s,t)}else if(s=Dm(e),typeof s==="function")for(e=s.call(e),o=0;!(u=e.next()).done;)u=u.value,s=l+Hi(u,o++),i+=tu(u,n,r,s,t);else if(u==="object")throw n=String(e),Error("Objects are not valid as a React child (found: "+(n==="[object Object]"?"object with keys {"+Object.keys(e).join(", ")+"}":n)+"). If you meant to render a collection of children, use an array instead.");return i}function lu(e,n,r){if(e==null)return e;var l=[],t=0;return tu(e,l,"","",function(u){return n.call(r,u,t++)}),l}function Fm(e){if(e._status===-1){var n=e._result;n=n(),n.then(function(r){if(e._status===0||e._status===-1)e._status=1,e._result=r},function(r){if(e._status===0||e._status===-1)e._status=2,e._result=r}),e._status===-1&&(e._status=0,e._result=n)}if(e._status===1)return e._result.default;throw e._result}var Ve={current:null},uu={transition:null},Om={ReactCurrentDispatcher:Ve,ReactCurrentBatchConfig:uu,ReactCurrentOwner:$i};function sa(){throw Error("act(...) is not supported in production builds of React.")}K.Children={map:lu,forEach:function(e,n,r){lu(e,function(){n.apply(this,arguments)},r)},count:function(e){var n=0;return lu(e,function(){n++}),n},toArray:function(e){return lu(e,function(n){return n})||[]},only:function(e){if(!Ai(e))throw Error("React.Children.only expected to receive a single React element child.");return e}};K.Component=Zr;K.Fragment=Em;K.Profiler=Nm;K.PureComponent=Bi;K.StrictMode=Cm;K.Suspense=Lm;K.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED=Om;K.act=sa;K.cloneElement=function(e,n,r){if(e===null||e===void 0)throw Error("React.cloneElement(...): The argument must be a React element, but you passed "+e+".");var l=ra({},e.props),t=e.key,u=e.ref,i=e._owner;if(n!=null){if(n.ref!==void 0&&(u=n.ref,i=$i.current),n.key!==void 0&&(t=""+n.key),e.type&&e.type.defaultProps)var o=e.type.defaultProps;for(s in n)ua.call(n,s)&&!ia.hasOwnProperty(s)&&(l[s]=n[s]===void 0&&o!==void 0?o[s]:n[s])}var s=arguments.length-2;if(s===1)l.children=r;else if(1<s){o=Array(s);for(var c=0;c<s;c++)o[c]=arguments[c+2];l.children=o}return{$$typeof:Hl,type:e.type,key:t,ref:u,props:l,_owner:i}};K.createContext=function(e){return e={$$typeof:_m,_currentValue:e,_currentValue2:e,_threadCount:0,Provider:null,Consumer:null,_defaultValue:null,_globalName:null},e.Provider={$$typeof:Pm,_context:e},e.Consumer=e};K.createElement=oa;K.createFactory=function(e){var n=oa.bind(null,e);return n.type=e,n};K.createRef=function(){return{current:null}};K.forwardRef=function(e){return{$$typeof:zm,render:e}};K.isValidElement=Ai;K.lazy=function(e){return{$$typeof:Tm,_payload:{_status:-1,_result:e},_init:Fm}};K.memo=function(e,n){return{$$typeof:xm,type:e,compare:n===void 0?null:n}};K.startTransition=function(e){var n=uu.transition;uu.transition={};try{e()}finally{uu.transition=n}};K.unstable_act=sa;K.useCallback=function(e,n){return Ve.current.useCallback(e,n)};K.useContext=function(e){return Ve.current.useContext(e)};K.useDebugValue=function(){};K.useDeferredValue=function(e){return Ve.current.useDeferredValue(e)};K.useEffect=function(e,n){return Ve.current.useEffect(e,n)};K.useId=function(){return Ve.current.useId()};K.useImperativeHandle=function(e,n,r){return Ve.current.useImperativeHandle(e,n,r)};K.useInsertionEffect=function(e,n){return Ve.current.useInsertionEffect(e,n)};K.useLayoutEffect=function(e,n){return Ve.current.useLayoutEffect(e,n)};K.useMemo=function(e,n){return Ve.current.useMemo(e,n)};K.useReducer=function(e,n,r){return Ve.current.useReducer(e,n,r)};K.useRef=function(e){return Ve.current.useRef(e)};K.useState=function(e){return Ve.current.useState(e)};K.useSyncExternalStore=function(e,n,r){return Ve.current.useSyncExternalStore(e,n,r)};K.useTransition=function(){return Ve.current.useTransition()};K.version="18.3.1"});var Gr=Rn((Bg,aa)=>{aa.exports=ca()});var ya=Rn((oe)=>{function Yi(e,n){var r=e.length;e.push(n);e:for(;0<r;){var l=r-1>>>1,t=e[l];if(0<iu(t,n))e[l]=n,e[r]=t,r=l;else break e}}function mn(e){return e.length===0?null:e[0]}function au(e){if(e.length===0)return null;var n=e[0],r=e.pop();if(r!==n){e[0]=r;e:for(var l=0,t=e.length,u=t>>>1;l<u;){var i=2*(l+1)-1,o=e[i],s=i+1,c=e[s];if(0>iu(o,r))s<t&&0>iu(c,o)?(e[l]=c,e[s]=r,l=s):(e[l]=o,e[i]=r,l=i);else if(s<t&&0>iu(c,r))e[l]=c,e[s]=r,l=s;else break e}}return n}function iu(e,n){var r=e.sortIndex-n.sortIndex;return r!==0?r:e.id-n.id}if(typeof performance==="object"&&typeof performance.now==="function")Zi=performance,oe.unstable_now=function(){return Zi.now()};else ou=Date,Gi=ou.now(),oe.unstable_now=function(){return ou.now()-Gi};var Zi,ou,Gi,Nn=[],Jn=[],Mm=1,tn=null,Fe=3,fu=!1,Cr=!1,Wl=!1,da=typeof setTimeout==="function"?setTimeout:null,pa=typeof clearTimeout==="function"?clearTimeout:null,fa=typeof setImmediate<"u"?setImmediate:null;typeof navigator<"u"&&navigator.scheduling!==void 0&&navigator.scheduling.isInputPending!==void 0&&navigator.scheduling.isInputPending.bind(navigator.scheduling);function Ji(e){for(var n=mn(Jn);n!==null;){if(n.callback===null)au(Jn);else if(n.startTime<=e)au(Jn),n.sortIndex=n.expirationTime,Yi(Nn,n);else break;n=mn(Jn)}}function qi(e){if(Wl=!1,Ji(e),!Cr)if(mn(Nn)!==null)Cr=!0,eo(bi);else{var n=mn(Jn);n!==null&&no(qi,n.startTime-e)}}function bi(e,n){Cr=!1,Wl&&(Wl=!1,pa($l),$l=-1),fu=!0;var r=Fe;try{Ji(n);for(tn=mn(Nn);tn!==null&&(!(tn.expirationTime>n)||e&&!ha());){var l=tn.callback;if(typeof l==="function"){tn.callback=null,Fe=tn.priorityLevel;var t=l(tn.expirationTime<=n);n=oe.unstable_now(),typeof t==="function"?tn.callback=t:tn===mn(Nn)&&au(Nn),Ji(n)}else au(Nn);tn=mn(Nn)}if(tn!==null)var u=!0;else{var i=mn(Jn);i!==null&&no(qi,i.startTime-n),u=!1}return u}finally{tn=null,Fe=r,fu=!1}}var du=!1,su=null,$l=-1,ma=5,va=-1;function ha(){return oe.unstable_now()-va<ma?!1:!0}function Ki(){if(su!==null){var e=oe.unstable_now();va=e;var n=!0;try{n=su(!0,e)}finally{n?Bl():(du=!1,su=null)}}else du=!1}var Bl;if(typeof fa==="function")Bl=function(){fa(Ki)};else if(typeof MessageChannel<"u")cu=new MessageChannel,Xi=cu.port2,cu.port1.onmessage=Ki,Bl=function(){Xi.postMessage(null)};else Bl=function(){da(Ki,0)};var cu,Xi;function eo(e){su=e,du||(du=!0,Bl())}function no(e,n){$l=da(function(){e(oe.unstable_now())},n)}oe.unstable_IdlePriority=5;oe.unstable_ImmediatePriority=1;oe.unstable_LowPriority=4;oe.unstable_NormalPriority=3;oe.unstable_Profiling=null;oe.unstable_UserBlockingPriority=2;oe.unstable_cancelCallback=function(e){e.callback=null};oe.unstable_continueExecution=function(){Cr||fu||(Cr=!0,eo(bi))};oe.unstable_forceFrameRate=function(e){0>e||125<e?console.error("forceFrameRate takes a positive int between 0 and 125, forcing frame rates higher than 125 fps is not supported"):ma=0<e?Math.floor(1000/e):5};oe.unstable_getCurrentPriorityLevel=function(){return Fe};oe.unstable_getFirstCallbackNode=function(){return mn(Nn)};oe.unstable_next=function(e){switch(Fe){case 1:case 2:case 3:var n=3;break;default:n=Fe}var r=Fe;Fe=n;try{return e()}finally{Fe=r}};oe.unstable_pauseExecution=function(){};oe.unstable_requestPaint=function(){};oe.unstable_runWithPriority=function(e,n){switch(e){case 1:case 2:case 3:case 4:case 5:break;default:e=3}var r=Fe;Fe=e;try{return n()}finally{Fe=r}};oe.unstable_scheduleCallback=function(e,n,r){var l=oe.unstable_now();switch(typeof r==="object"&&r!==null?(r=r.delay,r=typeof r==="number"&&0<r?l+r:l):r=l,e){case 1:var t=-1;break;case 2:t=250;break;case 5:t=1073741823;break;case 4:t=1e4;break;default:t=5000}return t=r+t,e={id:Mm++,callback:n,priorityLevel:e,startTime:r,expirationTime:t,sortIndex:-1},r>l?(e.sortIndex=r,Yi(Jn,e),mn(Nn)===null&&e===mn(Jn)&&(Wl?(pa($l),$l=-1):Wl=!0,no(qi,r-l))):(e.sortIndex=t,Yi(Nn,e),Cr||fu||(Cr=!0,eo(bi))),e};oe.unstable_shouldYield=ha;oe.unstable_wrapCallback=function(e){var n=Fe;return function(){var r=Fe;Fe=n;try{return e.apply(this,arguments)}finally{Fe=r}}}});var wa=Rn(($g,ga)=>{ga.exports=ya()});var Ep=Rn((ln)=>{var Um=Gr(),nn=wa();function _(e){for(var n="https://reactjs.org/docs/error-decoder.html?invariant="+e,r=1;r<arguments.length;r++)n+="&args[]="+encodeURIComponent(arguments[r]);return"Minified React error #"+e+"; visit "+n+" for the full message or use the non-minified dev environment for full errors and additional helpful warnings."}var Pf=new Set,vt={};function Ur(e,n){hl(e,n),hl(e+"Capture",n)}function hl(e,n){vt[e]=n;for(e=0;e<n.length;e++)Pf.add(n[e])}var Vn=!(typeof window>"u"||typeof window.document>"u"||typeof window.document.createElement>"u"),No=Object.prototype.hasOwnProperty,jm=/^[:A-Z_a-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD][:A-Z_a-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD\-.0-9\u00B7\u0300-\u036F\u203F-\u2040]*$/,ka={},Sa={};function Vm(e){if(No.call(Sa,e))return!0;if(No.call(ka,e))return!1;if(jm.test(e))return Sa[e]=!0;return ka[e]=!0,!1}function Qm(e,n,r,l){if(r!==null&&r.type===0)return!1;switch(typeof n){case"function":case"symbol":return!0;case"boolean":if(l)return!1;if(r!==null)return!r.acceptsBooleans;return e=e.toLowerCase().slice(0,5),e!=="data-"&&e!=="aria-";default:return!1}}function Hm(e,n,r,l){if(n===null||typeof n>"u"||Qm(e,n,r,l))return!0;if(l)return!1;if(r!==null)switch(r.type){case 3:return!n;case 4:return n===!1;case 5:return isNaN(n);case 6:return isNaN(n)||1>n}return!1}function Be(e,n,r,l,t,u,i){this.acceptsBooleans=n===2||n===3||n===4,this.attributeName=l,this.attributeNamespace=t,this.mustUseProperty=r,this.propertyName=e,this.type=n,this.sanitizeURL=u,this.removeEmptyString=i}var Re={};"children dangerouslySetInnerHTML defaultValue defaultChecked innerHTML suppressContentEditableWarning suppressHydrationWarning style".split(" ").forEach(function(e){Re[e]=new Be(e,0,!1,e,null,!1,!1)});[["acceptCharset","accept-charset"],["className","class"],["htmlFor","for"],["httpEquiv","http-equiv"]].forEach(function(e){var n=e[0];Re[n]=new Be(n,1,!1,e[1],null,!1,!1)});["contentEditable","draggable","spellCheck","value"].forEach(function(e){Re[e]=new Be(e,2,!1,e.toLowerCase(),null,!1,!1)});["autoReverse","externalResourcesRequired","focusable","preserveAlpha"].forEach(function(e){Re[e]=new Be(e,2,!1,e,null,!1,!1)});"allowFullScreen async autoFocus autoPlay controls default defer disabled disablePictureInPicture disableRemotePlayback formNoValidate hidden loop noModule noValidate open playsInline readOnly required reversed scoped seamless itemScope".split(" ").forEach(function(e){Re[e]=new Be(e,3,!1,e.toLowerCase(),null,!1,!1)});["checked","multiple","muted","selected"].forEach(function(e){Re[e]=new Be(e,3,!0,e,null,!1,!1)});["capture","download"].forEach(function(e){Re[e]=new Be(e,4,!1,e,null,!1,!1)});["cols","rows","size","span"].forEach(function(e){Re[e]=new Be(e,6,!1,e,null,!1,!1)});["rowSpan","start"].forEach(function(e){Re[e]=new Be(e,5,!1,e.toLowerCase(),null,!1,!1)});var gs=/[\-:]([a-z])/g;function ws(e){return e[1].toUpperCase()}"accent-height alignment-baseline arabic-form baseline-shift cap-height clip-path clip-rule color-interpolation color-interpolation-filters color-profile color-rendering dominant-baseline enable-background fill-opacity fill-rule flood-color flood-opacity font-family font-size font-size-adjust font-stretch font-style font-variant font-weight glyph-name glyph-orientation-horizontal glyph-orientation-vertical horiz-adv-x horiz-origin-x image-rendering letter-spacing lighting-color marker-end marker-mid marker-start overline-position overline-thickness paint-order panose-1 pointer-events rendering-intent shape-rendering stop-color stop-opacity strikethrough-position strikethrough-thickness stroke-dasharray stroke-dashoffset stroke-linecap stroke-linejoin stroke-miterlimit stroke-opacity stroke-width text-anchor text-decoration text-rendering underline-position underline-thickness unicode-bidi unicode-range units-per-em v-alphabetic v-hanging v-ideographic v-mathematical vector-effect vert-adv-y vert-origin-x vert-origin-y word-spacing writing-mode xmlns:xlink x-height".split(" ").forEach(function(e){var n=e.replace(gs,ws);Re[n]=new Be(n,1,!1,e,null,!1,!1)});"xlink:actuate xlink:arcrole xlink:role xlink:show xlink:title xlink:type".split(" ").forEach(function(e){var n=e.replace(gs,ws);Re[n]=new Be(n,1,!1,e,"http://www.w3.org/1999/xlink",!1,!1)});["xml:base","xml:lang","xml:space"].forEach(function(e){var n=e.replace(gs,ws);Re[n]=new Be(n,1,!1,e,"http://www.w3.org/XML/1998/namespace",!1,!1)});["tabIndex","crossOrigin"].forEach(function(e){Re[e]=new Be(e,1,!1,e.toLowerCase(),null,!1,!1)});Re.xlinkHref=new Be("xlinkHref",1,!1,"xlink:href","http://www.w3.org/1999/xlink",!0,!1);["src","href","action","formAction"].forEach(function(e){Re[e]=new Be(e,1,!1,e.toLowerCase(),null,!0,!0)});function ks(e,n,r,l){var t=Re.hasOwnProperty(n)?Re[n]:null;if(t!==null?t.type!==0:l||!(2<n.length)||n[0]!=="o"&&n[0]!=="O"||n[1]!=="n"&&n[1]!=="N")Hm(n,r,t,l)&&(r=null),l||t===null?Vm(n)&&(r===null?e.removeAttribute(n):e.setAttribute(n,""+r)):t.mustUseProperty?e[t.propertyName]=r===null?t.type===3?!1:"":r:(n=t.attributeName,l=t.attributeNamespace,r===null?e.removeAttribute(n):(t=t.type,r=t===3||t===4&&r===!0?"":""+r,l?e.setAttributeNS(l,n,r):e.setAttribute(n,r)))}var Wn=Um.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED,pu=Symbol.for("react.element"),qr=Symbol.for("react.portal"),br=Symbol.for("react.fragment"),Ss=Symbol.for("react.strict_mode"),Po=Symbol.for("react.profiler"),_f=Symbol.for("react.provider"),zf=Symbol.for("react.context"),Es=Symbol.for("react.forward_ref"),_o=Symbol.for("react.suspense"),zo=Symbol.for("react.suspense_list"),Cs=Symbol.for("react.memo"),qn=Symbol.for("react.lazy"),Lf=Symbol.for("react.offscreen"),Ea=Symbol.iterator;function Al(e){if(e===null||typeof e!=="object")return null;return e=Ea&&e[Ea]||e["@@iterator"],typeof e==="function"?e:null}var ge=Object.assign,ro;function ql(e){if(ro===void 0)try{throw Error()}catch(r){var n=r.stack.trim().match(/\n( *(at )?)/);ro=n&&n[1]||""}return`
`+ro+e}var lo=!1;function to(e,n){if(!e||lo)return"";lo=!0;var r=Error.prepareStackTrace;Error.prepareStackTrace=void 0;try{if(n)if(n=function(){throw Error()},Object.defineProperty(n.prototype,"props",{set:function(){throw Error()}}),typeof Reflect==="object"&&Reflect.construct){try{Reflect.construct(n,[])}catch(c){var l=c}Reflect.construct(e,[],n)}else{try{n.call()}catch(c){l=c}e.call(n.prototype)}else{try{throw Error()}catch(c){l=c}e()}}catch(c){if(c&&l&&typeof c.stack==="string"){for(var t=c.stack.split(`
`),u=l.stack.split(`
`),i=t.length-1,o=u.length-1;1<=i&&0<=o&&t[i]!==u[o];)o--;for(;1<=i&&0<=o;i--,o--)if(t[i]!==u[o]){if(i!==1||o!==1)do if(i--,o--,0>o||t[i]!==u[o]){var s=`
`+t[i].replace(" at new "," at ");return e.displayName&&s.includes("<anonymous>")&&(s=s.replace("<anonymous>",e.displayName)),s}while(1<=i&&0<=o);break}}}finally{lo=!1,Error.prepareStackTrace=r}return(e=e?e.displayName||e.name:"")?ql(e):""}function Bm(e){switch(e.tag){case 5:return ql(e.type);case 16:return ql("Lazy");case 13:return ql("Suspense");case 19:return ql("SuspenseList");case 0:case 2:case 15:return e=to(e.type,!1),e;case 11:return e=to(e.type.render,!1),e;case 1:return e=to(e.type,!0),e;default:return""}}function Lo(e){if(e==null)return null;if(typeof e==="function")return e.displayName||e.name||null;if(typeof e==="string")return e;switch(e){case br:return"Fragment";case qr:return"Portal";case Po:return"Profiler";case Ss:return"StrictMode";case _o:return"Suspense";case zo:return"SuspenseList"}if(typeof e==="object")switch(e.$$typeof){case zf:return(e.displayName||"Context")+".Consumer";case _f:return(e._context.displayName||"Context")+".Provider";case Es:var n=e.render;return e=e.displayName,e||(e=n.displayName||n.name||"",e=e!==""?"ForwardRef("+e+")":"ForwardRef"),e;case Cs:return n=e.displayName||null,n!==null?n:Lo(e.type)||"Memo";case qn:n=e._payload,e=e._init;try{return Lo(e(n))}catch(r){}}return null}function Wm(e){var n=e.type;switch(e.tag){case 24:return"Cache";case 9:return(n.displayName||"Context")+".Consumer";case 10:return(n._context.displayName||"Context")+".Provider";case 18:return"DehydratedFragment";case 11:return e=n.render,e=e.displayName||e.name||"",n.displayName||(e!==""?"ForwardRef("+e+")":"ForwardRef");case 7:return"Fragment";case 5:return n;case 4:return"Portal";case 3:return"Root";case 6:return"Text";case 16:return Lo(n);case 8:return n===Ss?"StrictMode":"Mode";case 22:return"Offscreen";case 12:return"Profiler";case 21:return"Scope";case 13:return"Suspense";case 19:return"SuspenseList";case 25:return"TracingMarker";case 1:case 0:case 17:case 2:case 14:case 15:if(typeof n==="function")return n.displayName||n.name||null;if(typeof n==="string")return n}return null}function dr(e){switch(typeof e){case"boolean":case"number":case"string":case"undefined":return e;case"object":return e;default:return""}}function xf(e){var n=e.type;return(e=e.nodeName)&&e.toLowerCase()==="input"&&(n==="checkbox"||n==="radio")}function $m(e){var n=xf(e)?"checked":"value",r=Object.getOwnPropertyDescriptor(e.constructor.prototype,n),l=""+e[n];if(!e.hasOwnProperty(n)&&typeof r<"u"&&typeof r.get==="function"&&typeof r.set==="function"){var{get:t,set:u}=r;return Object.defineProperty(e,n,{configurable:!0,get:function(){return t.call(this)},set:function(i){l=""+i,u.call(this,i)}}),Object.defineProperty(e,n,{enumerable:r.enumerable}),{getValue:function(){return l},setValue:function(i){l=""+i},stopTracking:function(){e._valueTracker=null,delete e[n]}}}}function mu(e){e._valueTracker||(e._valueTracker=$m(e))}function Tf(e){if(!e)return!1;var n=e._valueTracker;if(!n)return!0;var r=n.getValue(),l="";return e&&(l=xf(e)?e.checked?"true":"false":e.value),e=l,e!==r?(n.setValue(e),!0):!1}function Vu(e){if(e=e||(typeof document<"u"?document:void 0),typeof e>"u")return null;try{return e.activeElement||e.body}catch(n){return e.body}}function xo(e,n){var r=n.checked;return ge({},n,{defaultChecked:void 0,defaultValue:void 0,value:void 0,checked:r!=null?r:e._wrapperState.initialChecked})}function Ca(e,n){var r=n.defaultValue==null?"":n.defaultValue,l=n.checked!=null?n.checked:n.defaultChecked;r=dr(n.value!=null?n.value:r),e._wrapperState={initialChecked:l,initialValue:r,controlled:n.type==="checkbox"||n.type==="radio"?n.checked!=null:n.value!=null}}function Df(e,n){n=n.checked,n!=null&&ks(e,"checked",n,!1)}function To(e,n){Df(e,n);var r=dr(n.value),l=n.type;if(r!=null)if(l==="number"){if(r===0&&e.value===""||e.value!=r)e.value=""+r}else e.value!==""+r&&(e.value=""+r);else if(l==="submit"||l==="reset"){e.removeAttribute("value");return}n.hasOwnProperty("value")?Do(e,n.type,r):n.hasOwnProperty("defaultValue")&&Do(e,n.type,dr(n.defaultValue)),n.checked==null&&n.defaultChecked!=null&&(e.defaultChecked=!!n.defaultChecked)}function Na(e,n,r){if(n.hasOwnProperty("value")||n.hasOwnProperty("defaultValue")){var l=n.type;if(!(l!=="submit"&&l!=="reset"||n.value!==void 0&&n.value!==null))return;n=""+e._wrapperState.initialValue,r||n===e.value||(e.value=n),e.defaultValue=n}r=e.name,r!==""&&(e.name=""),e.defaultChecked=!!e._wrapperState.initialChecked,r!==""&&(e.name=r)}function Do(e,n,r){if(n!=="number"||Vu(e.ownerDocument)!==e)r==null?e.defaultValue=""+e._wrapperState.initialValue:e.defaultValue!==""+r&&(e.defaultValue=""+r)}var bl=Array.isArray;function al(e,n,r,l){if(e=e.options,n){n={};for(var t=0;t<r.length;t++)n["$"+r[t]]=!0;for(r=0;r<e.length;r++)t=n.hasOwnProperty("$"+e[r].value),e[r].selected!==t&&(e[r].selected=t),t&&l&&(e[r].defaultSelected=!0)}else{r=""+dr(r),n=null;for(t=0;t<e.length;t++){if(e[t].value===r){e[t].selected=!0,l&&(e[t].defaultSelected=!0);return}n!==null||e[t].disabled||(n=e[t])}n!==null&&(n.selected=!0)}}function Io(e,n){if(n.dangerouslySetInnerHTML!=null)throw Error(_(91));return ge({},n,{value:void 0,defaultValue:void 0,children:""+e._wrapperState.initialValue})}function Pa(e,n){var r=n.value;if(r==null){if(r=n.children,n=n.defaultValue,r!=null){if(n!=null)throw Error(_(92));if(bl(r)){if(1<r.length)throw Error(_(93));r=r[0]}n=r}n==null&&(n=""),r=n}e._wrapperState={initialValue:dr(r)}}function If(e,n){var r=dr(n.value),l=dr(n.defaultValue);r!=null&&(r=""+r,r!==e.value&&(e.value=r),n.defaultValue==null&&e.defaultValue!==r&&(e.defaultValue=r)),l!=null&&(e.defaultValue=""+l)}function _a(e){var n=e.textContent;n===e._wrapperState.initialValue&&n!==""&&n!==null&&(e.value=n)}function Rf(e){switch(e){case"svg":return"http://www.w3.org/2000/svg";case"math":return"http://www.w3.org/1998/Math/MathML";default:return"http://www.w3.org/1999/xhtml"}}function Ro(e,n){return e==null||e==="http://www.w3.org/1999/xhtml"?Rf(n):e==="http://www.w3.org/2000/svg"&&n==="foreignObject"?"http://www.w3.org/1999/xhtml":e}var vu,Ff=function(e){return typeof MSApp<"u"&&MSApp.execUnsafeLocalFunction?function(n,r,l,t){MSApp.execUnsafeLocalFunction(function(){return e(n,r,l,t)})}:e}(function(e,n){if(e.namespaceURI!=="http://www.w3.org/2000/svg"||"innerHTML"in e)e.innerHTML=n;else{vu=vu||document.createElement("div"),vu.innerHTML="<svg>"+n.valueOf().toString()+"</svg>";for(n=vu.firstChild;e.firstChild;)e.removeChild(e.firstChild);for(;n.firstChild;)e.appendChild(n.firstChild)}});function ht(e,n){if(n){var r=e.firstChild;if(r&&r===e.lastChild&&r.nodeType===3){r.nodeValue=n;return}}e.textContent=n}var it={animationIterationCount:!0,aspectRatio:!0,borderImageOutset:!0,borderImageSlice:!0,borderImageWidth:!0,boxFlex:!0,boxFlexGroup:!0,boxOrdinalGroup:!0,columnCount:!0,columns:!0,flex:!0,flexGrow:!0,flexPositive:!0,flexShrink:!0,flexNegative:!0,flexOrder:!0,gridArea:!0,gridRow:!0,gridRowEnd:!0,gridRowSpan:!0,gridRowStart:!0,gridColumn:!0,gridColumnEnd:!0,gridColumnSpan:!0,gridColumnStart:!0,fontWeight:!0,lineClamp:!0,lineHeight:!0,opacity:!0,order:!0,orphans:!0,tabSize:!0,widows:!0,zIndex:!0,zoom:!0,fillOpacity:!0,floodOpacity:!0,stopOpacity:!0,strokeDasharray:!0,strokeDashoffset:!0,strokeMiterlimit:!0,strokeOpacity:!0,strokeWidth:!0},Am=["Webkit","ms","Moz","O"];Object.keys(it).forEach(function(e){Am.forEach(function(n){n=n+e.charAt(0).toUpperCase()+e.substring(1),it[n]=it[e]})});function Of(e,n,r){return n==null||typeof n==="boolean"||n===""?"":r||typeof n!=="number"||n===0||it.hasOwnProperty(e)&&it[e]?(""+n).trim():n+"px"}function Mf(e,n){e=e.style;for(var r in n)if(n.hasOwnProperty(r)){var l=r.indexOf("--")===0,t=Of(r,n[r],l);r==="float"&&(r="cssFloat"),l?e.setProperty(r,t):e[r]=t}}var Km=ge({menuitem:!0},{area:!0,base:!0,br:!0,col:!0,embed:!0,hr:!0,img:!0,input:!0,keygen:!0,link:!0,meta:!0,param:!0,source:!0,track:!0,wbr:!0});function Fo(e,n){if(n){if(Km[e]&&(n.children!=null||n.dangerouslySetInnerHTML!=null))throw Error(_(137,e));if(n.dangerouslySetInnerHTML!=null){if(n.children!=null)throw Error(_(60));if(typeof n.dangerouslySetInnerHTML!=="object"||!("__html"in n.dangerouslySetInnerHTML))throw Error(_(61))}if(n.style!=null&&typeof n.style!=="object")throw Error(_(62))}}function Oo(e,n){if(e.indexOf("-")===-1)return typeof n.is==="string";switch(e){case"annotation-xml":case"color-profile":case"font-face":case"font-face-src":case"font-face-uri":case"font-face-format":case"font-face-name":case"missing-glyph":return!1;default:return!0}}var Mo=null;function Ns(e){return e=e.target||e.srcElement||window,e.correspondingUseElement&&(e=e.correspondingUseElement),e.nodeType===3?e.parentNode:e}var Uo=null,fl=null,dl=null;function za(e){if(e=Ft(e)){if(typeof Uo!=="function")throw Error(_(280));var n=e.stateNode;n&&(n=pi(n),Uo(e.stateNode,e.type,n))}}function Uf(e){fl?dl?dl.push(e):dl=[e]:fl=e}function jf(){if(fl){var e=fl,n=dl;if(dl=fl=null,za(e),n)for(e=0;e<n.length;e++)za(n[e])}}function Vf(e,n){return e(n)}function Qf(){}var uo=!1;function Hf(e,n,r){if(uo)return e(n,r);uo=!0;try{return Vf(e,n,r)}finally{if(uo=!1,fl!==null||dl!==null)Qf(),jf()}}function yt(e,n){var r=e.stateNode;if(r===null)return null;var l=pi(r);if(l===null)return null;r=l[n];e:switch(n){case"onClick":case"onClickCapture":case"onDoubleClick":case"onDoubleClickCapture":case"onMouseDown":case"onMouseDownCapture":case"onMouseMove":case"onMouseMoveCapture":case"onMouseUp":case"onMouseUpCapture":case"onMouseEnter":(l=!l.disabled)||(e=e.type,l=!(e==="button"||e==="input"||e==="select"||e==="textarea")),e=!l;break e;default:e=!1}if(e)return null;if(r&&typeof r!=="function")throw Error(_(231,n,typeof r));return r}var jo=!1;if(Vn)try{Nr={},Object.defineProperty(Nr,"passive",{get:function(){jo=!0}}),window.addEventListener("test",Nr,Nr),window.removeEventListener("test",Nr,Nr)}catch(e){jo=!1}var Nr;function Ym(e,n,r,l,t,u,i,o,s){var c=Array.prototype.slice.call(arguments,3);try{n.apply(r,c)}catch(d){this.onError(d)}}var ot=!1,Qu=null,Hu=!1,Vo=null,Zm={onError:function(e){ot=!0,Qu=e}};function Gm(e,n,r,l,t,u,i,o,s){ot=!1,Qu=null,Ym.apply(Zm,arguments)}function Jm(e,n,r,l,t,u,i,o,s){if(Gm.apply(this,arguments),ot){if(ot){var c=Qu;ot=!1,Qu=null}else throw Error(_(198));Hu||(Hu=!0,Vo=c)}}function jr(e){var n=e,r=e;if(e.alternate)for(;n.return;)n=n.return;else{e=n;do n=e,(n.flags&4098)!==0&&(r=n.return),e=n.return;while(e)}return n.tag===3?r:null}function Bf(e){if(e.tag===13){var n=e.memoizedState;if(n===null&&(e=e.alternate,e!==null&&(n=e.memoizedState)),n!==null)return n.dehydrated}return null}function La(e){if(jr(e)!==e)throw Error(_(188))}function Xm(e){var n=e.alternate;if(!n){if(n=jr(e),n===null)throw Error(_(188));return n!==e?null:e}for(var r=e,l=n;;){var t=r.return;if(t===null)break;var u=t.alternate;if(u===null){if(l=t.return,l!==null){r=l;continue}break}if(t.child===u.child){for(u=t.child;u;){if(u===r)return La(t),e;if(u===l)return La(t),n;u=u.sibling}throw Error(_(188))}if(r.return!==l.return)r=t,l=u;else{for(var i=!1,o=t.child;o;){if(o===r){i=!0,r=t,l=u;break}if(o===l){i=!0,l=t,r=u;break}o=o.sibling}if(!i){for(o=u.child;o;){if(o===r){i=!0,r=u,l=t;break}if(o===l){i=!0,l=u,r=t;break}o=o.sibling}if(!i)throw Error(_(189))}}if(r.alternate!==l)throw Error(_(190))}if(r.tag!==3)throw Error(_(188));return r.stateNode.current===r?e:n}function Wf(e){return e=Xm(e),e!==null?$f(e):null}function $f(e){if(e.tag===5||e.tag===6)return e;for(e=e.child;e!==null;){var n=$f(e);if(n!==null)return n;e=e.sibling}return null}var{unstable_scheduleCallback:Af,unstable_cancelCallback:xa,unstable_shouldYield:qm,unstable_requestPaint:bm,unstable_now:Ne,unstable_getCurrentPriorityLevel:e1,unstable_ImmediatePriority:Ps,unstable_UserBlockingPriority:Kf,unstable_NormalPriority:Bu,unstable_LowPriority:n1,unstable_IdlePriority:Yf}=nn,ci=null,Ln=null;function r1(e){if(Ln&&typeof Ln.onCommitFiberRoot==="function")try{Ln.onCommitFiberRoot(ci,e,void 0,(e.current.flags&128)===128)}catch(n){}}var wn=Math.clz32?Math.clz32:u1,l1=Math.log,t1=Math.LN2;function u1(e){return e>>>=0,e===0?32:31-(l1(e)/t1|0)|0}var hu=64,yu=4194304;function et(e){switch(e&-e){case 1:return 1;case 2:return 2;case 4:return 4;case 8:return 8;case 16:return 16;case 32:return 32;case 64:case 128:case 256:case 512:case 1024:case 2048:case 4096:case 8192:case 16384:case 32768:case 65536:case 131072:case 262144:case 524288:case 1048576:case 2097152:return e&4194240;case 4194304:case 8388608:case 16777216:case 33554432:case 67108864:return e&130023424;case 134217728:return 134217728;case 268435456:return 268435456;case 536870912:return 536870912;case 1073741824:return 1073741824;default:return e}}function Wu(e,n){var r=e.pendingLanes;if(r===0)return 0;var l=0,t=e.suspendedLanes,u=e.pingedLanes,i=r&268435455;if(i!==0){var o=i&~t;o!==0?l=et(o):(u&=i,u!==0&&(l=et(u)))}else i=r&~t,i!==0?l=et(i):u!==0&&(l=et(u));if(l===0)return 0;if(n!==0&&n!==l&&(n&t)===0&&(t=l&-l,u=n&-n,t>=u||t===16&&(u&4194240)!==0))return n;if((l&4)!==0&&(l|=r&16),n=e.entangledLanes,n!==0)for(e=e.entanglements,n&=l;0<n;)r=31-wn(n),t=1<<r,l|=e[r],n&=~t;return l}function i1(e,n){switch(e){case 1:case 2:case 4:return n+250;case 8:case 16:case 32:case 64:case 128:case 256:case 512:case 1024:case 2048:case 4096:case 8192:case 16384:case 32768:case 65536:case 131072:case 262144:case 524288:case 1048576:case 2097152:return n+5000;case 4194304:case 8388608:case 16777216:case 33554432:case 67108864:return-1;case 134217728:case 268435456:case 536870912:case 1073741824:return-1;default:return-1}}function o1(e,n){for(var{suspendedLanes:r,pingedLanes:l,expirationTimes:t,pendingLanes:u}=e;0<u;){var i=31-wn(u),o=1<<i,s=t[i];if(s===-1){if((o&r)===0||(o&l)!==0)t[i]=i1(o,n)}else s<=n&&(e.expiredLanes|=o);u&=~o}}function Qo(e){return e=e.pendingLanes&-1073741825,e!==0?e:e&1073741824?1073741824:0}function Zf(){var e=hu;return hu<<=1,(hu&4194240)===0&&(hu=64),e}function io(e){for(var n=[],r=0;31>r;r++)n.push(e);return n}function It(e,n,r){e.pendingLanes|=n,n!==536870912&&(e.suspendedLanes=0,e.pingedLanes=0),e=e.eventTimes,n=31-wn(n),e[n]=r}function s1(e,n){var r=e.pendingLanes&~n;e.pendingLanes=n,e.suspendedLanes=0,e.pingedLanes=0,e.expiredLanes&=n,e.mutableReadLanes&=n,e.entangledLanes&=n,n=e.entanglements;var l=e.eventTimes;for(e=e.expirationTimes;0<r;){var t=31-wn(r),u=1<<t;n[t]=0,l[t]=-1,e[t]=-1,r&=~u}}function _s(e,n){var r=e.entangledLanes|=n;for(e=e.entanglements;r;){var l=31-wn(r),t=1<<l;t&n|e[l]&n&&(e[l]|=n),r&=~t}}var te=0;function Gf(e){return e&=-e,1<e?4<e?(e&268435455)!==0?16:536870912:4:1}var Jf,zs,Xf,qf,bf,Ho=!1,gu=[],tr=null,ur=null,ir=null,gt=new Map,wt=new Map,er=[],c1="mousedown mouseup touchcancel touchend touchstart auxclick dblclick pointercancel pointerdown pointerup dragend dragstart drop compositionend compositionstart keydown keypress keyup input textInput copy cut paste click change contextmenu reset submit".split(" ");function Ta(e,n){switch(e){case"focusin":case"focusout":tr=null;break;case"dragenter":case"dragleave":ur=null;break;case"mouseover":case"mouseout":ir=null;break;case"pointerover":case"pointerout":gt.delete(n.pointerId);break;case"gotpointercapture":case"lostpointercapture":wt.delete(n.pointerId)}}function Kl(e,n,r,l,t,u){if(e===null||e.nativeEvent!==u)return e={blockedOn:n,domEventName:r,eventSystemFlags:l,nativeEvent:u,targetContainers:[t]},n!==null&&(n=Ft(n),n!==null&&zs(n)),e;return e.eventSystemFlags|=l,n=e.targetContainers,t!==null&&n.indexOf(t)===-1&&n.push(t),e}function a1(e,n,r,l,t){switch(n){case"focusin":return tr=Kl(tr,e,n,r,l,t),!0;case"dragenter":return ur=Kl(ur,e,n,r,l,t),!0;case"mouseover":return ir=Kl(ir,e,n,r,l,t),!0;case"pointerover":var u=t.pointerId;return gt.set(u,Kl(gt.get(u)||null,e,n,r,l,t)),!0;case"gotpointercapture":return u=t.pointerId,wt.set(u,Kl(wt.get(u)||null,e,n,r,l,t)),!0}return!1}function ed(e){var n=zr(e.target);if(n!==null){var r=jr(n);if(r!==null){if(n=r.tag,n===13){if(n=Bf(r),n!==null){e.blockedOn=n,bf(e.priority,function(){Xf(r)});return}}else if(n===3&&r.stateNode.current.memoizedState.isDehydrated){e.blockedOn=r.tag===3?r.stateNode.containerInfo:null;return}}}e.blockedOn=null}function Lu(e){if(e.blockedOn!==null)return!1;for(var n=e.targetContainers;0<n.length;){var r=Bo(e.domEventName,e.eventSystemFlags,n[0],e.nativeEvent);if(r===null){r=e.nativeEvent;var l=new r.constructor(r.type,r);Mo=l,r.target.dispatchEvent(l),Mo=null}else return n=Ft(r),n!==null&&zs(n),e.blockedOn=r,!1;n.shift()}return!0}function Da(e,n,r){Lu(e)&&r.delete(n)}function f1(){Ho=!1,tr!==null&&Lu(tr)&&(tr=null),ur!==null&&Lu(ur)&&(ur=null),ir!==null&&Lu(ir)&&(ir=null),gt.forEach(Da),wt.forEach(Da)}function Yl(e,n){e.blockedOn===n&&(e.blockedOn=null,Ho||(Ho=!0,nn.unstable_scheduleCallback(nn.unstable_NormalPriority,f1)))}function kt(e){function n(t){return Yl(t,e)}if(0<gu.length){Yl(gu[0],e);for(var r=1;r<gu.length;r++){var l=gu[r];l.blockedOn===e&&(l.blockedOn=null)}}tr!==null&&Yl(tr,e),ur!==null&&Yl(ur,e),ir!==null&&Yl(ir,e),gt.forEach(n),wt.forEach(n);for(r=0;r<er.length;r++)l=er[r],l.blockedOn===e&&(l.blockedOn=null);for(;0<er.length&&(r=er[0],r.blockedOn===null);)ed(r),r.blockedOn===null&&er.shift()}var pl=Wn.ReactCurrentBatchConfig,$u=!0;function d1(e,n,r,l){var t=te,u=pl.transition;pl.transition=null;try{te=1,Ls(e,n,r,l)}finally{te=t,pl.transition=u}}function p1(e,n,r,l){var t=te,u=pl.transition;pl.transition=null;try{te=4,Ls(e,n,r,l)}finally{te=t,pl.transition=u}}function Ls(e,n,r,l){if($u){var t=Bo(e,n,r,l);if(t===null)po(e,n,l,Au,r),Ta(e,l);else if(a1(t,e,n,r,l))l.stopPropagation();else if(Ta(e,l),n&4&&-1<c1.indexOf(e)){for(;t!==null;){var u=Ft(t);if(u!==null&&Jf(u),u=Bo(e,n,r,l),u===null&&po(e,n,l,Au,r),u===t)break;t=u}t!==null&&l.stopPropagation()}else po(e,n,l,null,r)}}var Au=null;function Bo(e,n,r,l){if(Au=null,e=Ns(l),e=zr(e),e!==null)if(n=jr(e),n===null)e=null;else if(r=n.tag,r===13){if(e=Bf(n),e!==null)return e;e=null}else if(r===3){if(n.stateNode.current.memoizedState.isDehydrated)return n.tag===3?n.stateNode.containerInfo:null;e=null}else n!==e&&(e=null);return Au=e,null}function nd(e){switch(e){case"cancel":case"click":case"close":case"contextmenu":case"copy":case"cut":case"auxclick":case"dblclick":case"dragend":case"dragstart":case"drop":case"focusin":case"focusout":case"input":case"invalid":case"keydown":case"keypress":case"keyup":case"mousedown":case"mouseup":case"paste":case"pause":case"play":case"pointercancel":case"pointerdown":case"pointerup":case"ratechange":case"reset":case"resize":case"seeked":case"submit":case"touchcancel":case"touchend":case"touchstart":case"volumechange":case"change":case"selectionchange":case"textInput":case"compositionstart":case"compositionend":case"compositionupdate":case"beforeblur":case"afterblur":case"beforeinput":case"blur":case"fullscreenchange":case"focus":case"hashchange":case"popstate":case"select":case"selectstart":return 1;case"drag":case"dragenter":case"dragexit":case"dragleave":case"dragover":case"mousemove":case"mouseout":case"mouseover":case"pointermove":case"pointerout":case"pointerover":case"scroll":case"toggle":case"touchmove":case"wheel":case"mouseenter":case"mouseleave":case"pointerenter":case"pointerleave":return 4;case"message":switch(e1()){case Ps:return 1;case Kf:return 4;case Bu:case n1:return 16;case Yf:return 536870912;default:return 16}default:return 16}}var rr=null,xs=null,xu=null;function rd(){if(xu)return xu;var e,n=xs,r=n.length,l,t="value"in rr?rr.value:rr.textContent,u=t.length;for(e=0;e<r&&n[e]===t[e];e++);var i=r-e;for(l=1;l<=i&&n[r-l]===t[u-l];l++);return xu=t.slice(e,1<l?1-l:void 0)}function Tu(e){var n=e.keyCode;return"charCode"in e?(e=e.charCode,e===0&&n===13&&(e=13)):e=n,e===10&&(e=13),32<=e||e===13?e:0}function wu(){return!0}function Ia(){return!1}function rn(e){function n(r,l,t,u,i){this._reactName=r,this._targetInst=t,this.type=l,this.nativeEvent=u,this.target=i,this.currentTarget=null;for(var o in e)e.hasOwnProperty(o)&&(r=e[o],this[o]=r?r(u):u[o]);return this.isDefaultPrevented=(u.defaultPrevented!=null?u.defaultPrevented:u.returnValue===!1)?wu:Ia,this.isPropagationStopped=Ia,this}return ge(n.prototype,{preventDefault:function(){this.defaultPrevented=!0;var r=this.nativeEvent;r&&(r.preventDefault?r.preventDefault():typeof r.returnValue!=="unknown"&&(r.returnValue=!1),this.isDefaultPrevented=wu)},stopPropagation:function(){var r=this.nativeEvent;r&&(r.stopPropagation?r.stopPropagation():typeof r.cancelBubble!=="unknown"&&(r.cancelBubble=!0),this.isPropagationStopped=wu)},persist:function(){},isPersistent:wu}),n}var Cl={eventPhase:0,bubbles:0,cancelable:0,timeStamp:function(e){return e.timeStamp||Date.now()},defaultPrevented:0,isTrusted:0},Ts=rn(Cl),Rt=ge({},Cl,{view:0,detail:0}),m1=rn(Rt),oo,so,Zl,ai=ge({},Rt,{screenX:0,screenY:0,clientX:0,clientY:0,pageX:0,pageY:0,ctrlKey:0,shiftKey:0,altKey:0,metaKey:0,getModifierState:Ds,button:0,buttons:0,relatedTarget:function(e){return e.relatedTarget===void 0?e.fromElement===e.srcElement?e.toElement:e.fromElement:e.relatedTarget},movementX:function(e){if("movementX"in e)return e.movementX;return e!==Zl&&(Zl&&e.type==="mousemove"?(oo=e.screenX-Zl.screenX,so=e.screenY-Zl.screenY):so=oo=0,Zl=e),oo},movementY:function(e){return"movementY"in e?e.movementY:so}}),Ra=rn(ai),v1=ge({},ai,{dataTransfer:0}),h1=rn(v1),y1=ge({},Rt,{relatedTarget:0}),co=rn(y1),g1=ge({},Cl,{animationName:0,elapsedTime:0,pseudoElement:0}),w1=rn(g1),k1=ge({},Cl,{clipboardData:function(e){return"clipboardData"in e?e.clipboardData:window.clipboardData}}),S1=rn(k1),E1=ge({},Cl,{data:0}),Fa=rn(E1),C1={Esc:"Escape",Spacebar:" ",Left:"ArrowLeft",Up:"ArrowUp",Right:"ArrowRight",Down:"ArrowDown",Del:"Delete",Win:"OS",Menu:"ContextMenu",Apps:"ContextMenu",Scroll:"ScrollLock",MozPrintableKey:"Unidentified"},N1={8:"Backspace",9:"Tab",12:"Clear",13:"Enter",16:"Shift",17:"Control",18:"Alt",19:"Pause",20:"CapsLock",27:"Escape",32:" ",33:"PageUp",34:"PageDown",35:"End",36:"Home",37:"ArrowLeft",38:"ArrowUp",39:"ArrowRight",40:"ArrowDown",45:"Insert",46:"Delete",112:"F1",113:"F2",114:"F3",115:"F4",116:"F5",117:"F6",118:"F7",119:"F8",120:"F9",121:"F10",122:"F11",123:"F12",144:"NumLock",145:"ScrollLock",224:"Meta"},P1={Alt:"altKey",Control:"ctrlKey",Meta:"metaKey",Shift:"shiftKey"};function _1(e){var n=this.nativeEvent;return n.getModifierState?n.getModifierState(e):(e=P1[e])?!!n[e]:!1}function Ds(){return _1}var z1=ge({},Rt,{key:function(e){if(e.key){var n=C1[e.key]||e.key;if(n!=="Unidentified")return n}return e.type==="keypress"?(e=Tu(e),e===13?"Enter":String.fromCharCode(e)):e.type==="keydown"||e.type==="keyup"?N1[e.keyCode]||"Unidentified":""},code:0,location:0,ctrlKey:0,shiftKey:0,altKey:0,metaKey:0,repeat:0,locale:0,getModifierState:Ds,charCode:function(e){return e.type==="keypress"?Tu(e):0},keyCode:function(e){return e.type==="keydown"||e.type==="keyup"?e.keyCode:0},which:function(e){return e.type==="keypress"?Tu(e):e.type==="keydown"||e.type==="keyup"?e.keyCode:0}}),L1=rn(z1),x1=ge({},ai,{pointerId:0,width:0,height:0,pressure:0,tangentialPressure:0,tiltX:0,tiltY:0,twist:0,pointerType:0,isPrimary:0}),Oa=rn(x1),T1=ge({},Rt,{touches:0,targetTouches:0,changedTouches:0,altKey:0,metaKey:0,ctrlKey:0,shiftKey:0,getModifierState:Ds}),D1=rn(T1),I1=ge({},Cl,{propertyName:0,elapsedTime:0,pseudoElement:0}),R1=rn(I1),F1=ge({},ai,{deltaX:function(e){return"deltaX"in e?e.deltaX:("wheelDeltaX"in e)?-e.wheelDeltaX:0},deltaY:function(e){return"deltaY"in e?e.deltaY:("wheelDeltaY"in e)?-e.wheelDeltaY:("wheelDelta"in e)?-e.wheelDelta:0},deltaZ:0,deltaMode:0}),O1=rn(F1),M1=[9,13,27,32],Is=Vn&&"CompositionEvent"in window,st=null;Vn&&"documentMode"in document&&(st=document.documentMode);var U1=Vn&&"TextEvent"in window&&!st,ld=Vn&&(!Is||st&&8<st&&11>=st),Ma=String.fromCharCode(32),Ua=!1;function td(e,n){switch(e){case"keyup":return M1.indexOf(n.keyCode)!==-1;case"keydown":return n.keyCode!==229;case"keypress":case"mousedown":case"focusout":return!0;default:return!1}}function ud(e){return e=e.detail,typeof e==="object"&&"data"in e?e.data:null}var el=!1;function j1(e,n){switch(e){case"compositionend":return ud(n);case"keypress":if(n.which!==32)return null;return Ua=!0,Ma;case"textInput":return e=n.data,e===Ma&&Ua?null:e;default:return null}}function V1(e,n){if(el)return e==="compositionend"||!Is&&td(e,n)?(e=rd(),xu=xs=rr=null,el=!1,e):null;switch(e){case"paste":return null;case"keypress":if(!(n.ctrlKey||n.altKey||n.metaKey)||n.ctrlKey&&n.altKey){if(n.char&&1<n.char.length)return n.char;if(n.which)return String.fromCharCode(n.which)}return null;case"compositionend":return ld&&n.locale!=="ko"?null:n.data;default:return null}}var Q1={color:!0,date:!0,datetime:!0,"datetime-local":!0,email:!0,month:!0,number:!0,password:!0,range:!0,search:!0,tel:!0,text:!0,time:!0,url:!0,week:!0};function ja(e){var n=e&&e.nodeName&&e.nodeName.toLowerCase();return n==="input"?!!Q1[e.type]:n==="textarea"?!0:!1}function id(e,n,r,l){Uf(l),n=Ku(n,"onChange"),0<n.length&&(r=new Ts("onChange","change",null,r,l),e.push({event:r,listeners:n}))}var ct=null,St=null;function H1(e){yd(e,0)}function fi(e){var n=ll(e);if(Tf(n))return e}function B1(e,n){if(e==="change")return n}var od=!1;if(Vn){if(Vn){if(rt="oninput"in document,!rt)Du=document.createElement("div"),Du.setAttribute("oninput","return;"),rt=typeof Du.oninput==="function";nt=rt}else nt=!1;od=nt&&(!document.documentMode||9<document.documentMode)}var nt,rt,Du;function Va(){ct&&(ct.detachEvent("onpropertychange",sd),St=ct=null)}function sd(e){if(e.propertyName==="value"&&fi(St)){var n=[];id(n,St,e,Ns(e)),Hf(H1,n)}}function W1(e,n,r){e==="focusin"?(Va(),ct=n,St=r,ct.attachEvent("onpropertychange",sd)):e==="focusout"&&Va()}function $1(e){if(e==="selectionchange"||e==="keyup"||e==="keydown")return fi(St)}function A1(e,n){if(e==="click")return fi(n)}function K1(e,n){if(e==="input"||e==="change")return fi(n)}function Y1(e,n){return e===n&&(e!==0||1/e===1/n)||e!==e&&n!==n}var Sn=typeof Object.is==="function"?Object.is:Y1;function Et(e,n){if(Sn(e,n))return!0;if(typeof e!=="object"||e===null||typeof n!=="object"||n===null)return!1;var r=Object.keys(e),l=Object.keys(n);if(r.length!==l.length)return!1;for(l=0;l<r.length;l++){var t=r[l];if(!No.call(n,t)||!Sn(e[t],n[t]))return!1}return!0}function Qa(e){for(;e&&e.firstChild;)e=e.firstChild;return e}function Ha(e,n){var r=Qa(e);e=0;for(var l;r;){if(r.nodeType===3){if(l=e+r.textContent.length,e<=n&&l>=n)return{node:r,offset:n-e};e=l}e:{for(;r;){if(r.nextSibling){r=r.nextSibling;break e}r=r.parentNode}r=void 0}r=Qa(r)}}function cd(e,n){return e&&n?e===n?!0:e&&e.nodeType===3?!1:n&&n.nodeType===3?cd(e,n.parentNode):("contains"in e)?e.contains(n):e.compareDocumentPosition?!!(e.compareDocumentPosition(n)&16):!1:!1}function ad(){for(var e=window,n=Vu();n instanceof e.HTMLIFrameElement;){try{var r=typeof n.contentWindow.location.href==="string"}catch(l){r=!1}if(r)e=n.contentWindow;else break;n=Vu(e.document)}return n}function Rs(e){var n=e&&e.nodeName&&e.nodeName.toLowerCase();return n&&(n==="input"&&(e.type==="text"||e.type==="search"||e.type==="tel"||e.type==="url"||e.type==="password")||n==="textarea"||e.contentEditable==="true")}function Z1(e){var n=ad(),r=e.focusedElem,l=e.selectionRange;if(n!==r&&r&&r.ownerDocument&&cd(r.ownerDocument.documentElement,r)){if(l!==null&&Rs(r)){if(n=l.start,e=l.end,e===void 0&&(e=n),"selectionStart"in r)r.selectionStart=n,r.selectionEnd=Math.min(e,r.value.length);else if(e=(n=r.ownerDocument||document)&&n.defaultView||window,e.getSelection){e=e.getSelection();var t=r.textContent.length,u=Math.min(l.start,t);l=l.end===void 0?u:Math.min(l.end,t),!e.extend&&u>l&&(t=l,l=u,u=t),t=Ha(r,u);var i=Ha(r,l);t&&i&&(e.rangeCount!==1||e.anchorNode!==t.node||e.anchorOffset!==t.offset||e.focusNode!==i.node||e.focusOffset!==i.offset)&&(n=n.createRange(),n.setStart(t.node,t.offset),e.removeAllRanges(),u>l?(e.addRange(n),e.extend(i.node,i.offset)):(n.setEnd(i.node,i.offset),e.addRange(n)))}}n=[];for(e=r;e=e.parentNode;)e.nodeType===1&&n.push({element:e,left:e.scrollLeft,top:e.scrollTop});typeof r.focus==="function"&&r.focus();for(r=0;r<n.length;r++)e=n[r],e.element.scrollLeft=e.left,e.element.scrollTop=e.top}}var G1=Vn&&"documentMode"in document&&11>=document.documentMode,nl=null,Wo=null,at=null,$o=!1;function Ba(e,n,r){var l=r.window===r?r.document:r.nodeType===9?r:r.ownerDocument;$o||nl==null||nl!==Vu(l)||(l=nl,("selectionStart"in l)&&Rs(l)?l={start:l.selectionStart,end:l.selectionEnd}:(l=(l.ownerDocument&&l.ownerDocument.defaultView||window).getSelection(),l={anchorNode:l.anchorNode,anchorOffset:l.anchorOffset,focusNode:l.focusNode,focusOffset:l.focusOffset}),at&&Et(at,l)||(at=l,l=Ku(Wo,"onSelect"),0<l.length&&(n=new Ts("onSelect","select",null,n,r),e.push({event:n,listeners:l}),n.target=nl)))}function ku(e,n){var r={};return r[e.toLowerCase()]=n.toLowerCase(),r["Webkit"+e]="webkit"+n,r["Moz"+e]="moz"+n,r}var rl={animationend:ku("Animation","AnimationEnd"),animationiteration:ku("Animation","AnimationIteration"),animationstart:ku("Animation","AnimationStart"),transitionend:ku("Transition","TransitionEnd")},ao={},fd={};Vn&&(fd=document.createElement("div").style,("AnimationEvent"in window)||(delete rl.animationend.animation,delete rl.animationiteration.animation,delete rl.animationstart.animation),("TransitionEvent"in window)||delete rl.transitionend.transition);function di(e){if(ao[e])return ao[e];if(!rl[e])return e;var n=rl[e],r;for(r in n)if(n.hasOwnProperty(r)&&r in fd)return ao[e]=n[r];return e}var dd=di("animationend"),pd=di("animationiteration"),md=di("animationstart"),vd=di("transitionend"),hd=new Map,Wa="abort auxClick cancel canPlay canPlayThrough click close contextMenu copy cut drag dragEnd dragEnter dragExit dragLeave dragOver dragStart drop durationChange emptied encrypted ended error gotPointerCapture input invalid keyDown keyPress keyUp load loadedData loadedMetadata loadStart lostPointerCapture mouseDown mouseMove mouseOut mouseOver mouseUp paste pause play playing pointerCancel pointerDown pointerMove pointerOut pointerOver pointerUp progress rateChange reset resize seeked seeking stalled submit suspend timeUpdate touchCancel touchEnd touchStart volumeChange scroll toggle touchMove waiting wheel".split(" ");function mr(e,n){hd.set(e,n),Ur(n,[e])}for(lt=0;lt<Wa.length;lt++)tt=Wa[lt],Ao=tt.toLowerCase(),Ko=tt[0].toUpperCase()+tt.slice(1),mr(Ao,"on"+Ko);var tt,Ao,Ko,lt;mr(dd,"onAnimationEnd");mr(pd,"onAnimationIteration");mr(md,"onAnimationStart");mr("dblclick","onDoubleClick");mr("focusin","onFocus");mr("focusout","onBlur");mr(vd,"onTransitionEnd");hl("onMouseEnter",["mouseout","mouseover"]);hl("onMouseLeave",["mouseout","mouseover"]);hl("onPointerEnter",["pointerout","pointerover"]);hl("onPointerLeave",["pointerout","pointerover"]);Ur("onChange","change click focusin focusout input keydown keyup selectionchange".split(" "));Ur("onSelect","focusout contextmenu dragend focusin keydown keyup mousedown mouseup selectionchange".split(" "));Ur("onBeforeInput",["compositionend","keypress","textInput","paste"]);Ur("onCompositionEnd","compositionend focusout keydown keypress keyup mousedown".split(" "));Ur("onCompositionStart","compositionstart focusout keydown keypress keyup mousedown".split(" "));Ur("onCompositionUpdate","compositionupdate focusout keydown keypress keyup mousedown".split(" "));var ut="abort canplay canplaythrough durationchange emptied encrypted ended error loadeddata loadedmetadata loadstart pause play playing progress ratechange resize seeked seeking stalled suspend timeupdate volumechange waiting".split(" "),J1=new Set("cancel close invalid load scroll toggle".split(" ").concat(ut));function $a(e,n,r){var l=e.type||"unknown-event";e.currentTarget=r,Jm(l,n,void 0,e),e.currentTarget=null}function yd(e,n){n=(n&4)!==0;for(var r=0;r<e.length;r++){var l=e[r],t=l.event;l=l.listeners;e:{var u=void 0;if(n)for(var i=l.length-1;0<=i;i--){var o=l[i],s=o.instance,c=o.currentTarget;if(o=o.listener,s!==u&&t.isPropagationStopped())break e;$a(t,o,c),u=s}else for(i=0;i<l.length;i++){if(o=l[i],s=o.instance,c=o.currentTarget,o=o.listener,s!==u&&t.isPropagationStopped())break e;$a(t,o,c),u=s}}}if(Hu)throw e=Vo,Hu=!1,Vo=null,e}function ae(e,n){var r=n[Xo];r===void 0&&(r=n[Xo]=new Set);var l=e+"__bubble";r.has(l)||(gd(n,e,2,!1),r.add(l))}function fo(e,n,r){var l=0;n&&(l|=4),gd(r,e,l,n)}var Su="_reactListening"+Math.random().toString(36).slice(2);function Ct(e){if(!e[Su]){e[Su]=!0,Pf.forEach(function(r){r!=="selectionchange"&&(J1.has(r)||fo(r,!1,e),fo(r,!0,e))});var n=e.nodeType===9?e:e.ownerDocument;n===null||n[Su]||(n[Su]=!0,fo("selectionchange",!1,n))}}function gd(e,n,r,l){switch(nd(n)){case 1:var t=d1;break;case 4:t=p1;break;default:t=Ls}r=t.bind(null,n,r,e),t=void 0,!jo||n!=="touchstart"&&n!=="touchmove"&&n!=="wheel"||(t=!0),l?t!==void 0?e.addEventListener(n,r,{capture:!0,passive:t}):e.addEventListener(n,r,!0):t!==void 0?e.addEventListener(n,r,{passive:t}):e.addEventListener(n,r,!1)}function po(e,n,r,l,t){var u=l;if((n&1)===0&&(n&2)===0&&l!==null)e:for(;;){if(l===null)return;var i=l.tag;if(i===3||i===4){var o=l.stateNode.containerInfo;if(o===t||o.nodeType===8&&o.parentNode===t)break;if(i===4)for(i=l.return;i!==null;){var s=i.tag;if(s===3||s===4){if(s=i.stateNode.containerInfo,s===t||s.nodeType===8&&s.parentNode===t)return}i=i.return}for(;o!==null;){if(i=zr(o),i===null)return;if(s=i.tag,s===5||s===6){l=u=i;continue e}o=o.parentNode}}l=l.return}Hf(function(){var c=u,d=Ns(r),a=[];e:{var v=hd.get(e);if(v!==void 0){var h=Ts,g=e;switch(e){case"keypress":if(Tu(r)===0)break e;case"keydown":case"keyup":h=L1;break;case"focusin":g="focus",h=co;break;case"focusout":g="blur",h=co;break;case"beforeblur":case"afterblur":h=co;break;case"click":if(r.button===2)break e;case"auxclick":case"dblclick":case"mousedown":case"mousemove":case"mouseup":case"mouseout":case"mouseover":case"contextmenu":h=Ra;break;case"drag":case"dragend":case"dragenter":case"dragexit":case"dragleave":case"dragover":case"dragstart":case"drop":h=h1;break;case"touchcancel":case"touchend":case"touchmove":case"touchstart":h=D1;break;case dd:case pd:case md:h=w1;break;case vd:h=R1;break;case"scroll":h=m1;break;case"wheel":h=O1;break;case"copy":case"cut":case"paste":h=S1;break;case"gotpointercapture":case"lostpointercapture":case"pointercancel":case"pointerdown":case"pointermove":case"pointerout":case"pointerover":case"pointerup":h=Oa}var y=(n&4)!==0,S=!y&&e==="scroll",m=y?v!==null?v+"Capture":null:v;y=[];for(var f=c,p;f!==null;){p=f;var w=p.stateNode;if(p.tag===5&&w!==null&&(p=w,m!==null&&(w=yt(f,m),w!=null&&y.push(Nt(f,w,p)))),S)break;f=f.return}0<y.length&&(v=new h(v,g,null,r,d),a.push({event:v,listeners:y}))}}if((n&7)===0){e:{if(v=e==="mouseover"||e==="pointerover",h=e==="mouseout"||e==="pointerout",v&&r!==Mo&&(g=r.relatedTarget||r.fromElement)&&(zr(g)||g[Qn]))break e;if(h||v){if(v=d.window===d?d:(v=d.ownerDocument)?v.defaultView||v.parentWindow:window,h){if(g=r.relatedTarget||r.toElement,h=c,g=g?zr(g):null,g!==null&&(S=jr(g),g!==S||g.tag!==5&&g.tag!==6))g=null}else h=null,g=c;if(h!==g){if(y=Ra,w="onMouseLeave",m="onMouseEnter",f="mouse",e==="pointerout"||e==="pointerover")y=Oa,w="onPointerLeave",m="onPointerEnter",f="pointer";if(S=h==null?v:ll(h),p=g==null?v:ll(g),v=new y(w,f+"leave",h,r,d),v.target=S,v.relatedTarget=p,w=null,zr(d)===c&&(y=new y(m,f+"enter",g,r,d),y.target=p,y.relatedTarget=S,w=y),S=w,h&&g)n:{y=h,m=g,f=0;for(p=y;p;p=Jr(p))f++;p=0;for(w=m;w;w=Jr(w))p++;for(;0<f-p;)y=Jr(y),f--;for(;0<p-f;)m=Jr(m),p--;for(;f--;){if(y===m||m!==null&&y===m.alternate)break n;y=Jr(y),m=Jr(m)}y=null}else y=null;h!==null&&Aa(a,v,h,y,!1),g!==null&&S!==null&&Aa(a,S,g,y,!0)}}}e:{if(v=c?ll(c):window,h=v.nodeName&&v.nodeName.toLowerCase(),h==="select"||h==="input"&&v.type==="file")var k=B1;else if(ja(v))if(od)k=K1;else{k=$1;var E=W1}else(h=v.nodeName)&&h.toLowerCase()==="input"&&(v.type==="checkbox"||v.type==="radio")&&(k=A1);if(k&&(k=k(e,c))){id(a,k,r,d);break e}E&&E(e,v,c),e==="focusout"&&(E=v._wrapperState)&&E.controlled&&v.type==="number"&&Do(v,"number",v.value)}switch(E=c?ll(c):window,e){case"focusin":if(ja(E)||E.contentEditable==="true")nl=E,Wo=c,at=null;break;case"focusout":at=Wo=nl=null;break;case"mousedown":$o=!0;break;case"contextmenu":case"mouseup":case"dragend":$o=!1,Ba(a,r,d);break;case"selectionchange":if(G1)break;case"keydown":case"keyup":Ba(a,r,d)}var P;if(Is)e:{switch(e){case"compositionstart":var N="onCompositionStart";break e;case"compositionend":N="onCompositionEnd";break e;case"compositionupdate":N="onCompositionUpdate";break e}N=void 0}else el?td(e,r)&&(N="onCompositionEnd"):e==="keydown"&&r.keyCode===229&&(N="onCompositionStart");if(N&&(ld&&r.locale!=="ko"&&(el||N!=="onCompositionStart"?N==="onCompositionEnd"&&el&&(P=rd()):(rr=d,xs=("value"in rr)?rr.value:rr.textContent,el=!0)),E=Ku(c,N),0<E.length&&(N=new Fa(N,e,null,r,d),a.push({event:N,listeners:E}),P?N.data=P:(P=ud(r),P!==null&&(N.data=P)))),P=U1?j1(e,r):V1(e,r))c=Ku(c,"onBeforeInput"),0<c.length&&(d=new Fa("onBeforeInput","beforeinput",null,r,d),a.push({event:d,listeners:c}),d.data=P)}yd(a,n)})}function Nt(e,n,r){return{instance:e,listener:n,currentTarget:r}}function Ku(e,n){for(var r=n+"Capture",l=[];e!==null;){var t=e,u=t.stateNode;t.tag===5&&u!==null&&(t=u,u=yt(e,r),u!=null&&l.unshift(Nt(e,u,t)),u=yt(e,n),u!=null&&l.push(Nt(e,u,t))),e=e.return}return l}function Jr(e){if(e===null)return null;do e=e.return;while(e&&e.tag!==5);return e?e:null}function Aa(e,n,r,l,t){for(var u=n._reactName,i=[];r!==null&&r!==l;){var o=r,s=o.alternate,c=o.stateNode;if(s!==null&&s===l)break;o.tag===5&&c!==null&&(o=c,t?(s=yt(r,u),s!=null&&i.unshift(Nt(r,s,o))):t||(s=yt(r,u),s!=null&&i.push(Nt(r,s,o)))),r=r.return}i.length!==0&&e.push({event:n,listeners:i})}var X1=/\r\n?/g,q1=/\u0000|\uFFFD/g;function Ka(e){return(typeof e==="string"?e:""+e).replace(X1,`
`).replace(q1,"")}function Eu(e,n,r){if(n=Ka(n),Ka(e)!==n&&r)throw Error(_(425))}function Yu(){}var Yo=null,Zo=null;function Go(e,n){return e==="textarea"||e==="noscript"||typeof n.children==="string"||typeof n.children==="number"||typeof n.dangerouslySetInnerHTML==="object"&&n.dangerouslySetInnerHTML!==null&&n.dangerouslySetInnerHTML.__html!=null}var Jo=typeof setTimeout==="function"?setTimeout:void 0,b1=typeof clearTimeout==="function"?clearTimeout:void 0,Ya=typeof Promise==="function"?Promise:void 0,ev=typeof queueMicrotask==="function"?queueMicrotask:typeof Ya<"u"?function(e){return Ya.resolve(null).then(e).catch(nv)}:Jo;function nv(e){setTimeout(function(){throw e})}function mo(e,n){var r=n,l=0;do{var t=r.nextSibling;if(e.removeChild(r),t&&t.nodeType===8)if(r=t.data,r==="/$"){if(l===0){e.removeChild(t),kt(n);return}l--}else r!=="$"&&r!=="$?"&&r!=="$!"||l++;r=t}while(r);kt(n)}function or(e){for(;e!=null;e=e.nextSibling){var n=e.nodeType;if(n===1||n===3)break;if(n===8){if(n=e.data,n==="$"||n==="$!"||n==="$?")break;if(n==="/$")return null}}return e}function Za(e){e=e.previousSibling;for(var n=0;e;){if(e.nodeType===8){var r=e.data;if(r==="$"||r==="$!"||r==="$?"){if(n===0)return e;n--}else r==="/$"&&n++}e=e.previousSibling}return null}var Nl=Math.random().toString(36).slice(2),zn="__reactFiber$"+Nl,Pt="__reactProps$"+Nl,Qn="__reactContainer$"+Nl,Xo="__reactEvents$"+Nl,rv="__reactListeners$"+Nl,lv="__reactHandles$"+Nl;function zr(e){var n=e[zn];if(n)return n;for(var r=e.parentNode;r;){if(n=r[Qn]||r[zn]){if(r=n.alternate,n.child!==null||r!==null&&r.child!==null)for(e=Za(e);e!==null;){if(r=e[zn])return r;e=Za(e)}return n}e=r,r=e.parentNode}return null}function Ft(e){return e=e[zn]||e[Qn],!e||e.tag!==5&&e.tag!==6&&e.tag!==13&&e.tag!==3?null:e}function ll(e){if(e.tag===5||e.tag===6)return e.stateNode;throw Error(_(33))}function pi(e){return e[Pt]||null}var qo=[],tl=-1;function vr(e){return{current:e}}function fe(e){0>tl||(e.current=qo[tl],qo[tl]=null,tl--)}function se(e,n){tl++,qo[tl]=e.current,e.current=n}var pr={},je=vr(pr),Ke=vr(!1),Ir=pr;function yl(e,n){var r=e.type.contextTypes;if(!r)return pr;var l=e.stateNode;if(l&&l.__reactInternalMemoizedUnmaskedChildContext===n)return l.__reactInternalMemoizedMaskedChildContext;var t={},u;for(u in r)t[u]=n[u];return l&&(e=e.stateNode,e.__reactInternalMemoizedUnmaskedChildContext=n,e.__reactInternalMemoizedMaskedChildContext=t),t}function Ye(e){return e=e.childContextTypes,e!==null&&e!==void 0}function Zu(){fe(Ke),fe(je)}function Ga(e,n,r){if(je.current!==pr)throw Error(_(168));se(je,n),se(Ke,r)}function wd(e,n,r){var l=e.stateNode;if(n=n.childContextTypes,typeof l.getChildContext!=="function")return r;l=l.getChildContext();for(var t in l)if(!(t in n))throw Error(_(108,Wm(e)||"Unknown",t));return ge({},r,l)}function Gu(e){return e=(e=e.stateNode)&&e.__reactInternalMemoizedMergedChildContext||pr,Ir=je.current,se(je,e),se(Ke,Ke.current),!0}function Ja(e,n,r){var l=e.stateNode;if(!l)throw Error(_(169));r?(e=wd(e,n,Ir),l.__reactInternalMemoizedMergedChildContext=e,fe(Ke),fe(je),se(je,e)):fe(Ke),se(Ke,r)}var On=null,mi=!1,vo=!1;function kd(e){On===null?On=[e]:On.push(e)}function tv(e){mi=!0,kd(e)}function hr(){if(!vo&&On!==null){vo=!0;var e=0,n=te;try{var r=On;for(te=1;e<r.length;e++){var l=r[e];do l=l(!0);while(l!==null)}On=null,mi=!1}catch(t){throw On!==null&&(On=On.slice(e+1)),Af(Ps,hr),t}finally{te=n,vo=!1}}return null}var ul=[],il=0,Ju=null,Xu=0,un=[],on=0,Rr=null,Mn=1,Un="";function Pr(e,n){ul[il++]=Xu,ul[il++]=Ju,Ju=e,Xu=n}function Sd(e,n,r){un[on++]=Mn,un[on++]=Un,un[on++]=Rr,Rr=e;var l=Mn;e=Un;var t=32-wn(l)-1;l&=~(1<<t),r+=1;var u=32-wn(n)+t;if(30<u){var i=t-t%5;u=(l&(1<<i)-1).toString(32),l>>=i,t-=i,Mn=1<<32-wn(n)+t|r<<t|l,Un=u+e}else Mn=1<<u|r<<t|l,Un=e}function Fs(e){e.return!==null&&(Pr(e,1),Sd(e,1,0))}function Os(e){for(;e===Ju;)Ju=ul[--il],ul[il]=null,Xu=ul[--il],ul[il]=null;for(;e===Rr;)Rr=un[--on],un[on]=null,Un=un[--on],un[on]=null,Mn=un[--on],un[on]=null}var en=null,be=null,de=!1,gn=null;function Ed(e,n){var r=sn(5,null,null,0);r.elementType="DELETED",r.stateNode=n,r.return=e,n=e.deletions,n===null?(e.deletions=[r],e.flags|=16):n.push(r)}function Xa(e,n){switch(e.tag){case 5:var r=e.type;return n=n.nodeType!==1||r.toLowerCase()!==n.nodeName.toLowerCase()?null:n,n!==null?(e.stateNode=n,en=e,be=or(n.firstChild),!0):!1;case 6:return n=e.pendingProps===""||n.nodeType!==3?null:n,n!==null?(e.stateNode=n,en=e,be=null,!0):!1;case 13:return n=n.nodeType!==8?null:n,n!==null?(r=Rr!==null?{id:Mn,overflow:Un}:null,e.memoizedState={dehydrated:n,treeContext:r,retryLane:1073741824},r=sn(18,null,null,0),r.stateNode=n,r.return=e,e.child=r,en=e,be=null,!0):!1;default:return!1}}function bo(e){return(e.mode&1)!==0&&(e.flags&128)===0}function es(e){if(de){var n=be;if(n){var r=n;if(!Xa(e,n)){if(bo(e))throw Error(_(418));n=or(r.nextSibling);var l=en;n&&Xa(e,n)?Ed(l,r):(e.flags=e.flags&-4097|2,de=!1,en=e)}}else{if(bo(e))throw Error(_(418));e.flags=e.flags&-4097|2,de=!1,en=e}}}function qa(e){for(e=e.return;e!==null&&e.tag!==5&&e.tag!==3&&e.tag!==13;)e=e.return;en=e}function Cu(e){if(e!==en)return!1;if(!de)return qa(e),de=!0,!1;var n;if((n=e.tag!==3)&&!(n=e.tag!==5)&&(n=e.type,n=n!=="head"&&n!=="body"&&!Go(e.type,e.memoizedProps)),n&&(n=be)){if(bo(e))throw Cd(),Error(_(418));for(;n;)Ed(e,n),n=or(n.nextSibling)}if(qa(e),e.tag===13){if(e=e.memoizedState,e=e!==null?e.dehydrated:null,!e)throw Error(_(317));e:{e=e.nextSibling;for(n=0;e;){if(e.nodeType===8){var r=e.data;if(r==="/$"){if(n===0){be=or(e.nextSibling);break e}n--}else r!=="$"&&r!=="$!"&&r!=="$?"||n++}e=e.nextSibling}be=null}}else be=en?or(e.stateNode.nextSibling):null;return!0}function Cd(){for(var e=be;e;)e=or(e.nextSibling)}function gl(){be=en=null,de=!1}function Ms(e){gn===null?gn=[e]:gn.push(e)}var uv=Wn.ReactCurrentBatchConfig;function Gl(e,n,r){if(e=r.ref,e!==null&&typeof e!=="function"&&typeof e!=="object"){if(r._owner){if(r=r._owner,r){if(r.tag!==1)throw Error(_(309));var l=r.stateNode}if(!l)throw Error(_(147,e));var t=l,u=""+e;if(n!==null&&n.ref!==null&&typeof n.ref==="function"&&n.ref._stringRef===u)return n.ref;return n=function(i){var o=t.refs;i===null?delete o[u]:o[u]=i},n._stringRef=u,n}if(typeof e!=="string")throw Error(_(284));if(!r._owner)throw Error(_(290,e))}return e}function Nu(e,n){throw e=Object.prototype.toString.call(n),Error(_(31,e==="[object Object]"?"object with keys {"+Object.keys(n).join(", ")+"}":e))}function ba(e){var n=e._init;return n(e._payload)}function Nd(e){function n(m,f){if(e){var p=m.deletions;p===null?(m.deletions=[f],m.flags|=16):p.push(f)}}function r(m,f){if(!e)return null;for(;f!==null;)n(m,f),f=f.sibling;return null}function l(m,f){for(m=new Map;f!==null;)f.key!==null?m.set(f.key,f):m.set(f.index,f),f=f.sibling;return m}function t(m,f){return m=fr(m,f),m.index=0,m.sibling=null,m}function u(m,f,p){if(m.index=p,!e)return m.flags|=1048576,f;if(p=m.alternate,p!==null)return p=p.index,p<f?(m.flags|=2,f):p;return m.flags|=2,f}function i(m){return e&&m.alternate===null&&(m.flags|=2),m}function o(m,f,p,w){if(f===null||f.tag!==6)return f=Eo(p,m.mode,w),f.return=m,f;return f=t(f,p),f.return=m,f}function s(m,f,p,w){var k=p.type;if(k===br)return d(m,f,p.props.children,w,p.key);if(f!==null&&(f.elementType===k||typeof k==="object"&&k!==null&&k.$$typeof===qn&&ba(k)===f.type))return w=t(f,p.props),w.ref=Gl(m,f,p),w.return=m,w;return w=ju(p.type,p.key,p.props,null,m.mode,w),w.ref=Gl(m,f,p),w.return=m,w}function c(m,f,p,w){if(f===null||f.tag!==4||f.stateNode.containerInfo!==p.containerInfo||f.stateNode.implementation!==p.implementation)return f=Co(p,m.mode,w),f.return=m,f;return f=t(f,p.children||[]),f.return=m,f}function d(m,f,p,w,k){if(f===null||f.tag!==7)return f=Dr(p,m.mode,w,k),f.return=m,f;return f=t(f,p),f.return=m,f}function a(m,f,p){if(typeof f==="string"&&f!==""||typeof f==="number")return f=Eo(""+f,m.mode,p),f.return=m,f;if(typeof f==="object"&&f!==null){switch(f.$$typeof){case pu:return p=ju(f.type,f.key,f.props,null,m.mode,p),p.ref=Gl(m,null,f),p.return=m,p;case qr:return f=Co(f,m.mode,p),f.return=m,f;case qn:var w=f._init;return a(m,w(f._payload),p)}if(bl(f)||Al(f))return f=Dr(f,m.mode,p,null),f.return=m,f;Nu(m,f)}return null}function v(m,f,p,w){var k=f!==null?f.key:null;if(typeof p==="string"&&p!==""||typeof p==="number")return k!==null?null:o(m,f,""+p,w);if(typeof p==="object"&&p!==null){switch(p.$$typeof){case pu:return p.key===k?s(m,f,p,w):null;case qr:return p.key===k?c(m,f,p,w):null;case qn:return k=p._init,v(m,f,k(p._payload),w)}if(bl(p)||Al(p))return k!==null?null:d(m,f,p,w,null);Nu(m,p)}return null}function h(m,f,p,w,k){if(typeof w==="string"&&w!==""||typeof w==="number")return m=m.get(p)||null,o(f,m,""+w,k);if(typeof w==="object"&&w!==null){switch(w.$$typeof){case pu:return m=m.get(w.key===null?p:w.key)||null,s(f,m,w,k);case qr:return m=m.get(w.key===null?p:w.key)||null,c(f,m,w,k);case qn:var E=w._init;return h(m,f,p,E(w._payload),k)}if(bl(w)||Al(w))return m=m.get(p)||null,d(f,m,w,k,null);Nu(f,w)}return null}function g(m,f,p,w){for(var k=null,E=null,P=f,N=f=0,x=null;P!==null&&N<p.length;N++){P.index>N?(x=P,P=null):x=P.sibling;var L=v(m,P,p[N],w);if(L===null){P===null&&(P=x);break}e&&P&&L.alternate===null&&n(m,P),f=u(L,f,N),E===null?k=L:E.sibling=L,E=L,P=x}if(N===p.length)return r(m,P),de&&Pr(m,N),k;if(P===null){for(;N<p.length;N++)P=a(m,p[N],w),P!==null&&(f=u(P,f,N),E===null?k=P:E.sibling=P,E=P);return de&&Pr(m,N),k}for(P=l(m,P);N<p.length;N++)x=h(P,m,N,p[N],w),x!==null&&(e&&x.alternate!==null&&P.delete(x.key===null?N:x.key),f=u(x,f,N),E===null?k=x:E.sibling=x,E=x);return e&&P.forEach(function(T){return n(m,T)}),de&&Pr(m,N),k}function y(m,f,p,w){var k=Al(p);if(typeof k!=="function")throw Error(_(150));if(p=k.call(p),p==null)throw Error(_(151));for(var E=k=null,P=f,N=f=0,x=null,L=p.next();P!==null&&!L.done;N++,L=p.next()){P.index>N?(x=P,P=null):x=P.sibling;var T=v(m,P,L.value,w);if(T===null){P===null&&(P=x);break}e&&P&&T.alternate===null&&n(m,P),f=u(T,f,N),E===null?k=T:E.sibling=T,E=T,P=x}if(L.done)return r(m,P),de&&Pr(m,N),k;if(P===null){for(;!L.done;N++,L=p.next())L=a(m,L.value,w),L!==null&&(f=u(L,f,N),E===null?k=L:E.sibling=L,E=L);return de&&Pr(m,N),k}for(P=l(m,P);!L.done;N++,L=p.next())L=h(P,m,N,L.value,w),L!==null&&(e&&L.alternate!==null&&P.delete(L.key===null?N:L.key),f=u(L,f,N),E===null?k=L:E.sibling=L,E=L);return e&&P.forEach(function(V){return n(m,V)}),de&&Pr(m,N),k}function S(m,f,p,w){if(typeof p==="object"&&p!==null&&p.type===br&&p.key===null&&(p=p.props.children),typeof p==="object"&&p!==null){switch(p.$$typeof){case pu:e:{for(var k=p.key,E=f;E!==null;){if(E.key===k){if(k=p.type,k===br){if(E.tag===7){r(m,E.sibling),f=t(E,p.props.children),f.return=m,m=f;break e}}else if(E.elementType===k||typeof k==="object"&&k!==null&&k.$$typeof===qn&&ba(k)===E.type){r(m,E.sibling),f=t(E,p.props),f.ref=Gl(m,E,p),f.return=m,m=f;break e}r(m,E);break}else n(m,E);E=E.sibling}p.type===br?(f=Dr(p.props.children,m.mode,w,p.key),f.return=m,m=f):(w=ju(p.type,p.key,p.props,null,m.mode,w),w.ref=Gl(m,f,p),w.return=m,m=w)}return i(m);case qr:e:{for(E=p.key;f!==null;){if(f.key===E)if(f.tag===4&&f.stateNode.containerInfo===p.containerInfo&&f.stateNode.implementation===p.implementation){r(m,f.sibling),f=t(f,p.children||[]),f.return=m,m=f;break e}else{r(m,f);break}else n(m,f);f=f.sibling}f=Co(p,m.mode,w),f.return=m,m=f}return i(m);case qn:return E=p._init,S(m,f,E(p._payload),w)}if(bl(p))return g(m,f,p,w);if(Al(p))return y(m,f,p,w);Nu(m,p)}return typeof p==="string"&&p!==""||typeof p==="number"?(p=""+p,f!==null&&f.tag===6?(r(m,f.sibling),f=t(f,p),f.return=m,m=f):(r(m,f),f=Eo(p,m.mode,w),f.return=m,m=f),i(m)):r(m,f)}return S}var wl=Nd(!0),Pd=Nd(!1),qu=vr(null),bu=null,ol=null,Us=null;function js(){Us=ol=bu=null}function Vs(e){var n=qu.current;fe(qu),e._currentValue=n}function ns(e,n,r){for(;e!==null;){var l=e.alternate;if((e.childLanes&n)!==n?(e.childLanes|=n,l!==null&&(l.childLanes|=n)):l!==null&&(l.childLanes&n)!==n&&(l.childLanes|=n),e===r)break;e=e.return}}function ml(e,n){bu=e,Us=ol=null,e=e.dependencies,e!==null&&e.firstContext!==null&&((e.lanes&n)!==0&&(Ae=!0),e.firstContext=null)}function an(e){var n=e._currentValue;if(Us!==e)if(e={context:e,memoizedValue:n,next:null},ol===null){if(bu===null)throw Error(_(308));ol=e,bu.dependencies={lanes:0,firstContext:e}}else ol=ol.next=e;return n}var Lr=null;function Qs(e){Lr===null?Lr=[e]:Lr.push(e)}function _d(e,n,r,l){var t=n.interleaved;return t===null?(r.next=r,Qs(n)):(r.next=t.next,t.next=r),n.interleaved=r,Hn(e,l)}function Hn(e,n){e.lanes|=n;var r=e.alternate;r!==null&&(r.lanes|=n),r=e;for(e=e.return;e!==null;)e.childLanes|=n,r=e.alternate,r!==null&&(r.childLanes|=n),r=e,e=e.return;return r.tag===3?r.stateNode:null}var bn=!1;function Hs(e){e.updateQueue={baseState:e.memoizedState,firstBaseUpdate:null,lastBaseUpdate:null,shared:{pending:null,interleaved:null,lanes:0},effects:null}}function zd(e,n){e=e.updateQueue,n.updateQueue===e&&(n.updateQueue={baseState:e.baseState,firstBaseUpdate:e.firstBaseUpdate,lastBaseUpdate:e.lastBaseUpdate,shared:e.shared,effects:e.effects})}function jn(e,n){return{eventTime:e,lane:n,tag:0,payload:null,callback:null,next:null}}function sr(e,n,r){var l=e.updateQueue;if(l===null)return null;if(l=l.shared,(ee&2)!==0){var t=l.pending;return t===null?n.next=n:(n.next=t.next,t.next=n),l.pending=n,Hn(e,r)}return t=l.interleaved,t===null?(n.next=n,Qs(l)):(n.next=t.next,t.next=n),l.interleaved=n,Hn(e,r)}function Iu(e,n,r){if(n=n.updateQueue,n!==null&&(n=n.shared,(r&4194240)!==0)){var l=n.lanes;l&=e.pendingLanes,r|=l,n.lanes=r,_s(e,r)}}function ef(e,n){var{updateQueue:r,alternate:l}=e;if(l!==null&&(l=l.updateQueue,r===l)){var t=null,u=null;if(r=r.firstBaseUpdate,r!==null){do{var i={eventTime:r.eventTime,lane:r.lane,tag:r.tag,payload:r.payload,callback:r.callback,next:null};u===null?t=u=i:u=u.next=i,r=r.next}while(r!==null);u===null?t=u=n:u=u.next=n}else t=u=n;r={baseState:l.baseState,firstBaseUpdate:t,lastBaseUpdate:u,shared:l.shared,effects:l.effects},e.updateQueue=r;return}e=r.lastBaseUpdate,e===null?r.firstBaseUpdate=n:e.next=n,r.lastBaseUpdate=n}function ei(e,n,r,l){var t=e.updateQueue;bn=!1;var{firstBaseUpdate:u,lastBaseUpdate:i}=t,o=t.shared.pending;if(o!==null){t.shared.pending=null;var s=o,c=s.next;s.next=null,i===null?u=c:i.next=c,i=s;var d=e.alternate;d!==null&&(d=d.updateQueue,o=d.lastBaseUpdate,o!==i&&(o===null?d.firstBaseUpdate=c:o.next=c,d.lastBaseUpdate=s))}if(u!==null){var a=t.baseState;i=0,d=c=s=null,o=u;do{var{lane:v,eventTime:h}=o;if((l&v)===v){d!==null&&(d=d.next={eventTime:h,lane:0,tag:o.tag,payload:o.payload,callback:o.callback,next:null});e:{var g=e,y=o;switch(v=n,h=r,y.tag){case 1:if(g=y.payload,typeof g==="function"){a=g.call(h,a,v);break e}a=g;break e;case 3:g.flags=g.flags&-65537|128;case 0:if(g=y.payload,v=typeof g==="function"?g.call(h,a,v):g,v===null||v===void 0)break e;a=ge({},a,v);break e;case 2:bn=!0}}o.callback!==null&&o.lane!==0&&(e.flags|=64,v=t.effects,v===null?t.effects=[o]:v.push(o))}else h={eventTime:h,lane:v,tag:o.tag,payload:o.payload,callback:o.callback,next:null},d===null?(c=d=h,s=a):d=d.next=h,i|=v;if(o=o.next,o===null)if(o=t.shared.pending,o===null)break;else v=o,o=v.next,v.next=null,t.lastBaseUpdate=v,t.shared.pending=null}while(1);if(d===null&&(s=a),t.baseState=s,t.firstBaseUpdate=c,t.lastBaseUpdate=d,n=t.shared.interleaved,n!==null){t=n;do i|=t.lane,t=t.next;while(t!==n)}else u===null&&(t.shared.lanes=0);Or|=i,e.lanes=i,e.memoizedState=a}}function nf(e,n,r){if(e=n.effects,n.effects=null,e!==null)for(n=0;n<e.length;n++){var l=e[n],t=l.callback;if(t!==null){if(l.callback=null,l=r,typeof t!=="function")throw Error(_(191,t));t.call(l)}}}var Ot={},xn=vr(Ot),_t=vr(Ot),zt=vr(Ot);function xr(e){if(e===Ot)throw Error(_(174));return e}function Bs(e,n){switch(se(zt,n),se(_t,e),se(xn,Ot),e=n.nodeType,e){case 9:case 11:n=(n=n.documentElement)?n.namespaceURI:Ro(null,"");break;default:e=e===8?n.parentNode:n,n=e.namespaceURI||null,e=e.tagName,n=Ro(n,e)}fe(xn),se(xn,n)}function kl(){fe(xn),fe(_t),fe(zt)}function Ld(e){xr(zt.current);var n=xr(xn.current),r=Ro(n,e.type);n!==r&&(se(_t,e),se(xn,r))}function Ws(e){_t.current===e&&(fe(xn),fe(_t))}var he=vr(0);function ni(e){for(var n=e;n!==null;){if(n.tag===13){var r=n.memoizedState;if(r!==null&&(r=r.dehydrated,r===null||r.data==="$?"||r.data==="$!"))return n}else if(n.tag===19&&n.memoizedProps.revealOrder!==void 0){if((n.flags&128)!==0)return n}else if(n.child!==null){n.child.return=n,n=n.child;continue}if(n===e)break;for(;n.sibling===null;){if(n.return===null||n.return===e)return null;n=n.return}n.sibling.return=n.return,n=n.sibling}return null}var ho=[];function $s(){for(var e=0;e<ho.length;e++)ho[e]._workInProgressVersionPrimary=null;ho.length=0}var{ReactCurrentDispatcher:Ru,ReactCurrentBatchConfig:yo}=Wn,Fr=0,ye=null,_e=null,xe=null,ri=!1,ft=!1,Lt=0,iv=0;function Oe(){throw Error(_(321))}function As(e,n){if(n===null)return!1;for(var r=0;r<n.length&&r<e.length;r++)if(!Sn(e[r],n[r]))return!1;return!0}function Ks(e,n,r,l,t,u){if(Fr=u,ye=n,n.memoizedState=null,n.updateQueue=null,n.lanes=0,Ru.current=e===null||e.memoizedState===null?av:fv,e=r(l,t),ft){u=0;do{if(ft=!1,Lt=0,25<=u)throw Error(_(301));u+=1,xe=_e=null,n.updateQueue=null,Ru.current=dv,e=r(l,t)}while(ft)}if(Ru.current=li,n=_e!==null&&_e.next!==null,Fr=0,xe=_e=ye=null,ri=!1,n)throw Error(_(300));return e}function Ys(){var e=Lt!==0;return Lt=0,e}function _n(){var e={memoizedState:null,baseState:null,baseQueue:null,queue:null,next:null};return xe===null?ye.memoizedState=xe=e:xe=xe.next=e,xe}function fn(){if(_e===null){var e=ye.alternate;e=e!==null?e.memoizedState:null}else e=_e.next;var n=xe===null?ye.memoizedState:xe.next;if(n!==null)xe=n,_e=e;else{if(e===null)throw Error(_(310));_e=e,e={memoizedState:_e.memoizedState,baseState:_e.baseState,baseQueue:_e.baseQueue,queue:_e.queue,next:null},xe===null?ye.memoizedState=xe=e:xe=xe.next=e}return xe}function xt(e,n){return typeof n==="function"?n(e):n}function go(e){var n=fn(),r=n.queue;if(r===null)throw Error(_(311));r.lastRenderedReducer=e;var l=_e,t=l.baseQueue,u=r.pending;if(u!==null){if(t!==null){var i=t.next;t.next=u.next,u.next=i}l.baseQueue=t=u,r.pending=null}if(t!==null){u=t.next,l=l.baseState;var o=i=null,s=null,c=u;do{var d=c.lane;if((Fr&d)===d)s!==null&&(s=s.next={lane:0,action:c.action,hasEagerState:c.hasEagerState,eagerState:c.eagerState,next:null}),l=c.hasEagerState?c.eagerState:e(l,c.action);else{var a={lane:d,action:c.action,hasEagerState:c.hasEagerState,eagerState:c.eagerState,next:null};s===null?(o=s=a,i=l):s=s.next=a,ye.lanes|=d,Or|=d}c=c.next}while(c!==null&&c!==u);s===null?i=l:s.next=o,Sn(l,n.memoizedState)||(Ae=!0),n.memoizedState=l,n.baseState=i,n.baseQueue=s,r.lastRenderedState=l}if(e=r.interleaved,e!==null){t=e;do u=t.lane,ye.lanes|=u,Or|=u,t=t.next;while(t!==e)}else t===null&&(r.lanes=0);return[n.memoizedState,r.dispatch]}function wo(e){var n=fn(),r=n.queue;if(r===null)throw Error(_(311));r.lastRenderedReducer=e;var{dispatch:l,pending:t}=r,u=n.memoizedState;if(t!==null){r.pending=null;var i=t=t.next;do u=e(u,i.action),i=i.next;while(i!==t);Sn(u,n.memoizedState)||(Ae=!0),n.memoizedState=u,n.baseQueue===null&&(n.baseState=u),r.lastRenderedState=u}return[u,l]}function xd(){}function Td(e,n){var r=ye,l=fn(),t=n(),u=!Sn(l.memoizedState,t);if(u&&(l.memoizedState=t,Ae=!0),l=l.queue,Zs(Rd.bind(null,r,l,e),[e]),l.getSnapshot!==n||u||xe!==null&&xe.memoizedState.tag&1){if(r.flags|=2048,Tt(9,Id.bind(null,r,l,t,n),void 0,null),Te===null)throw Error(_(349));(Fr&30)!==0||Dd(r,n,t)}return t}function Dd(e,n,r){e.flags|=16384,e={getSnapshot:n,value:r},n=ye.updateQueue,n===null?(n={lastEffect:null,stores:null},ye.updateQueue=n,n.stores=[e]):(r=n.stores,r===null?n.stores=[e]:r.push(e))}function Id(e,n,r,l){n.value=r,n.getSnapshot=l,Fd(n)&&Od(e)}function Rd(e,n,r){return r(function(){Fd(n)&&Od(e)})}function Fd(e){var n=e.getSnapshot;e=e.value;try{var r=n();return!Sn(e,r)}catch(l){return!0}}function Od(e){var n=Hn(e,1);n!==null&&kn(n,e,1,-1)}function rf(e){var n=_n();return typeof e==="function"&&(e=e()),n.memoizedState=n.baseState=e,e={pending:null,interleaved:null,lanes:0,dispatch:null,lastRenderedReducer:xt,lastRenderedState:e},n.queue=e,e=e.dispatch=cv.bind(null,ye,e),[n.memoizedState,e]}function Tt(e,n,r,l){return e={tag:e,create:n,destroy:r,deps:l,next:null},n=ye.updateQueue,n===null?(n={lastEffect:null,stores:null},ye.updateQueue=n,n.lastEffect=e.next=e):(r=n.lastEffect,r===null?n.lastEffect=e.next=e:(l=r.next,r.next=e,e.next=l,n.lastEffect=e)),e}function Md(){return fn().memoizedState}function Fu(e,n,r,l){var t=_n();ye.flags|=e,t.memoizedState=Tt(1|n,r,void 0,l===void 0?null:l)}function vi(e,n,r,l){var t=fn();l=l===void 0?null:l;var u=void 0;if(_e!==null){var i=_e.memoizedState;if(u=i.destroy,l!==null&&As(l,i.deps)){t.memoizedState=Tt(n,r,u,l);return}}ye.flags|=e,t.memoizedState=Tt(1|n,r,u,l)}function lf(e,n){return Fu(8390656,8,e,n)}function Zs(e,n){return vi(2048,8,e,n)}function Ud(e,n){return vi(4,2,e,n)}function jd(e,n){return vi(4,4,e,n)}function Vd(e,n){if(typeof n==="function")return e=e(),n(e),function(){n(null)};if(n!==null&&n!==void 0)return e=e(),n.current=e,function(){n.current=null}}function Qd(e,n,r){return r=r!==null&&r!==void 0?r.concat([e]):null,vi(4,4,Vd.bind(null,n,e),r)}function Gs(){}function Hd(e,n){var r=fn();n=n===void 0?null:n;var l=r.memoizedState;if(l!==null&&n!==null&&As(n,l[1]))return l[0];return r.memoizedState=[e,n],e}function Bd(e,n){var r=fn();n=n===void 0?null:n;var l=r.memoizedState;if(l!==null&&n!==null&&As(n,l[1]))return l[0];return e=e(),r.memoizedState=[e,n],e}function Wd(e,n,r){if((Fr&21)===0)return e.baseState&&(e.baseState=!1,Ae=!0),e.memoizedState=r;return Sn(r,n)||(r=Zf(),ye.lanes|=r,Or|=r,e.baseState=!0),n}function ov(e,n){var r=te;te=r!==0&&4>r?r:4,e(!0);var l=yo.transition;yo.transition={};try{e(!1),n()}finally{te=r,yo.transition=l}}function $d(){return fn().memoizedState}function sv(e,n,r){var l=ar(e);if(r={lane:l,action:r,hasEagerState:!1,eagerState:null,next:null},Ad(e))Kd(n,r);else if(r=_d(e,n,r,l),r!==null){var t=He();kn(r,e,l,t),Yd(r,n,l)}}function cv(e,n,r){var l=ar(e),t={lane:l,action:r,hasEagerState:!1,eagerState:null,next:null};if(Ad(e))Kd(n,t);else{var u=e.alternate;if(e.lanes===0&&(u===null||u.lanes===0)&&(u=n.lastRenderedReducer,u!==null))try{var i=n.lastRenderedState,o=u(i,r);if(t.hasEagerState=!0,t.eagerState=o,Sn(o,i)){var s=n.interleaved;s===null?(t.next=t,Qs(n)):(t.next=s.next,s.next=t),n.interleaved=t;return}}catch(c){}finally{}r=_d(e,n,t,l),r!==null&&(t=He(),kn(r,e,l,t),Yd(r,n,l))}}function Ad(e){var n=e.alternate;return e===ye||n!==null&&n===ye}function Kd(e,n){ft=ri=!0;var r=e.pending;r===null?n.next=n:(n.next=r.next,r.next=n),e.pending=n}function Yd(e,n,r){if((r&4194240)!==0){var l=n.lanes;l&=e.pendingLanes,r|=l,n.lanes=r,_s(e,r)}}var li={readContext:an,useCallback:Oe,useContext:Oe,useEffect:Oe,useImperativeHandle:Oe,useInsertionEffect:Oe,useLayoutEffect:Oe,useMemo:Oe,useReducer:Oe,useRef:Oe,useState:Oe,useDebugValue:Oe,useDeferredValue:Oe,useTransition:Oe,useMutableSource:Oe,useSyncExternalStore:Oe,useId:Oe,unstable_isNewReconciler:!1},av={readContext:an,useCallback:function(e,n){return _n().memoizedState=[e,n===void 0?null:n],e},useContext:an,useEffect:lf,useImperativeHandle:function(e,n,r){return r=r!==null&&r!==void 0?r.concat([e]):null,Fu(4194308,4,Vd.bind(null,n,e),r)},useLayoutEffect:function(e,n){return Fu(4194308,4,e,n)},useInsertionEffect:function(e,n){return Fu(4,2,e,n)},useMemo:function(e,n){var r=_n();return n=n===void 0?null:n,e=e(),r.memoizedState=[e,n],e},useReducer:function(e,n,r){var l=_n();return n=r!==void 0?r(n):n,l.memoizedState=l.baseState=n,e={pending:null,interleaved:null,lanes:0,dispatch:null,lastRenderedReducer:e,lastRenderedState:n},l.queue=e,e=e.dispatch=sv.bind(null,ye,e),[l.memoizedState,e]},useRef:function(e){var n=_n();return e={current:e},n.memoizedState=e},useState:rf,useDebugValue:Gs,useDeferredValue:function(e){return _n().memoizedState=e},useTransition:function(){var e=rf(!1),n=e[0];return e=ov.bind(null,e[1]),_n().memoizedState=e,[n,e]},useMutableSource:function(){},useSyncExternalStore:function(e,n,r){var l=ye,t=_n();if(de){if(r===void 0)throw Error(_(407));r=r()}else{if(r=n(),Te===null)throw Error(_(349));(Fr&30)!==0||Dd(l,n,r)}t.memoizedState=r;var u={value:r,getSnapshot:n};return t.queue=u,lf(Rd.bind(null,l,u,e),[e]),l.flags|=2048,Tt(9,Id.bind(null,l,u,r,n),void 0,null),r},useId:function(){var e=_n(),n=Te.identifierPrefix;if(de){var r=Un,l=Mn;r=(l&~(1<<32-wn(l)-1)).toString(32)+r,n=":"+n+"R"+r,r=Lt++,0<r&&(n+="H"+r.toString(32)),n+=":"}else r=iv++,n=":"+n+"r"+r.toString(32)+":";return e.memoizedState=n},unstable_isNewReconciler:!1},fv={readContext:an,useCallback:Hd,useContext:an,useEffect:Zs,useImperativeHandle:Qd,useInsertionEffect:Ud,useLayoutEffect:jd,useMemo:Bd,useReducer:go,useRef:Md,useState:function(){return go(xt)},useDebugValue:Gs,useDeferredValue:function(e){var n=fn();return Wd(n,_e.memoizedState,e)},useTransition:function(){var e=go(xt)[0],n=fn().memoizedState;return[e,n]},useMutableSource:xd,useSyncExternalStore:Td,useId:$d,unstable_isNewReconciler:!1},dv={readContext:an,useCallback:Hd,useContext:an,useEffect:Zs,useImperativeHandle:Qd,useInsertionEffect:Ud,useLayoutEffect:jd,useMemo:Bd,useReducer:wo,useRef:Md,useState:function(){return wo(xt)},useDebugValue:Gs,useDeferredValue:function(e){var n=fn();return _e===null?n.memoizedState=e:Wd(n,_e.memoizedState,e)},useTransition:function(){var e=wo(xt)[0],n=fn().memoizedState;return[e,n]},useMutableSource:xd,useSyncExternalStore:Td,useId:$d,unstable_isNewReconciler:!1};function hn(e,n){if(e&&e.defaultProps){n=ge({},n),e=e.defaultProps;for(var r in e)n[r]===void 0&&(n[r]=e[r]);return n}return n}function rs(e,n,r,l){n=e.memoizedState,r=r(l,n),r=r===null||r===void 0?n:ge({},n,r),e.memoizedState=r,e.lanes===0&&(e.updateQueue.baseState=r)}var hi={isMounted:function(e){return(e=e._reactInternals)?jr(e)===e:!1},enqueueSetState:function(e,n,r){e=e._reactInternals;var l=He(),t=ar(e),u=jn(l,t);u.payload=n,r!==void 0&&r!==null&&(u.callback=r),n=sr(e,u,t),n!==null&&(kn(n,e,t,l),Iu(n,e,t))},enqueueReplaceState:function(e,n,r){e=e._reactInternals;var l=He(),t=ar(e),u=jn(l,t);u.tag=1,u.payload=n,r!==void 0&&r!==null&&(u.callback=r),n=sr(e,u,t),n!==null&&(kn(n,e,t,l),Iu(n,e,t))},enqueueForceUpdate:function(e,n){e=e._reactInternals;var r=He(),l=ar(e),t=jn(r,l);t.tag=2,n!==void 0&&n!==null&&(t.callback=n),n=sr(e,t,l),n!==null&&(kn(n,e,l,r),Iu(n,e,l))}};function tf(e,n,r,l,t,u,i){return e=e.stateNode,typeof e.shouldComponentUpdate==="function"?e.shouldComponentUpdate(l,u,i):n.prototype&&n.prototype.isPureReactComponent?!Et(r,l)||!Et(t,u):!0}function Zd(e,n,r){var l=!1,t=pr,u=n.contextType;return typeof u==="object"&&u!==null?u=an(u):(t=Ye(n)?Ir:je.current,l=n.contextTypes,u=(l=l!==null&&l!==void 0)?yl(e,t):pr),n=new n(r,u),e.memoizedState=n.state!==null&&n.state!==void 0?n.state:null,n.updater=hi,e.stateNode=n,n._reactInternals=e,l&&(e=e.stateNode,e.__reactInternalMemoizedUnmaskedChildContext=t,e.__reactInternalMemoizedMaskedChildContext=u),n}function uf(e,n,r,l){e=n.state,typeof n.componentWillReceiveProps==="function"&&n.componentWillReceiveProps(r,l),typeof n.UNSAFE_componentWillReceiveProps==="function"&&n.UNSAFE_componentWillReceiveProps(r,l),n.state!==e&&hi.enqueueReplaceState(n,n.state,null)}function ls(e,n,r,l){var t=e.stateNode;t.props=r,t.state=e.memoizedState,t.refs={},Hs(e);var u=n.contextType;typeof u==="object"&&u!==null?t.context=an(u):(u=Ye(n)?Ir:je.current,t.context=yl(e,u)),t.state=e.memoizedState,u=n.getDerivedStateFromProps,typeof u==="function"&&(rs(e,n,u,r),t.state=e.memoizedState),typeof n.getDerivedStateFromProps==="function"||typeof t.getSnapshotBeforeUpdate==="function"||typeof t.UNSAFE_componentWillMount!=="function"&&typeof t.componentWillMount!=="function"||(n=t.state,typeof t.componentWillMount==="function"&&t.componentWillMount(),typeof t.UNSAFE_componentWillMount==="function"&&t.UNSAFE_componentWillMount(),n!==t.state&&hi.enqueueReplaceState(t,t.state,null),ei(e,r,t,l),t.state=e.memoizedState),typeof t.componentDidMount==="function"&&(e.flags|=4194308)}function Sl(e,n){try{var r="",l=n;do r+=Bm(l),l=l.return;while(l);var t=r}catch(u){t=`
Error generating stack: `+u.message+`
`+u.stack}return{value:e,source:n,stack:t,digest:null}}function ko(e,n,r){return{value:e,source:null,stack:r!=null?r:null,digest:n!=null?n:null}}function ts(e,n){try{console.error(n.value)}catch(r){setTimeout(function(){throw r})}}var pv=typeof WeakMap==="function"?WeakMap:Map;function Gd(e,n,r){r=jn(-1,r),r.tag=3,r.payload={element:null};var l=n.value;return r.callback=function(){ui||(ui=!0,ms=l),ts(e,n)},r}function Jd(e,n,r){r=jn(-1,r),r.tag=3;var l=e.type.getDerivedStateFromError;if(typeof l==="function"){var t=n.value;r.payload=function(){return l(t)},r.callback=function(){ts(e,n)}}var u=e.stateNode;return u!==null&&typeof u.componentDidCatch==="function"&&(r.callback=function(){ts(e,n),typeof l!=="function"&&(cr===null?cr=new Set([this]):cr.add(this));var i=n.stack;this.componentDidCatch(n.value,{componentStack:i!==null?i:""})}),r}function of(e,n,r){var l=e.pingCache;if(l===null){l=e.pingCache=new pv;var t=new Set;l.set(n,t)}else t=l.get(n),t===void 0&&(t=new Set,l.set(n,t));t.has(r)||(t.add(r),e=zv.bind(null,e,n,r),n.then(e,e))}function sf(e){do{var n;if(n=e.tag===13)n=e.memoizedState,n=n!==null?n.dehydrated!==null?!0:!1:!0;if(n)return e;e=e.return}while(e!==null);return null}function cf(e,n,r,l,t){if((e.mode&1)===0)return e===n?e.flags|=65536:(e.flags|=128,r.flags|=131072,r.flags&=-52805,r.tag===1&&(r.alternate===null?r.tag=17:(n=jn(-1,1),n.tag=2,sr(r,n,1))),r.lanes|=1),e;return e.flags|=65536,e.lanes=t,e}var mv=Wn.ReactCurrentOwner,Ae=!1;function Qe(e,n,r,l){n.child=e===null?Pd(n,null,r,l):wl(n,e.child,r,l)}function af(e,n,r,l,t){r=r.render;var u=n.ref;if(ml(n,t),l=Ks(e,n,r,l,u,t),r=Ys(),e!==null&&!Ae)return n.updateQueue=e.updateQueue,n.flags&=-2053,e.lanes&=~t,Bn(e,n,t);return de&&r&&Fs(n),n.flags|=1,Qe(e,n,l,t),n.child}function ff(e,n,r,l,t){if(e===null){var u=r.type;if(typeof u==="function"&&!lc(u)&&u.defaultProps===void 0&&r.compare===null&&r.defaultProps===void 0)return n.tag=15,n.type=u,Xd(e,n,u,l,t);return e=ju(r.type,null,l,n,n.mode,t),e.ref=n.ref,e.return=n,n.child=e}if(u=e.child,(e.lanes&t)===0){var i=u.memoizedProps;if(r=r.compare,r=r!==null?r:Et,r(i,l)&&e.ref===n.ref)return Bn(e,n,t)}return n.flags|=1,e=fr(u,l),e.ref=n.ref,e.return=n,n.child=e}function Xd(e,n,r,l,t){if(e!==null){var u=e.memoizedProps;if(Et(u,l)&&e.ref===n.ref)if(Ae=!1,n.pendingProps=l=u,(e.lanes&t)!==0)(e.flags&131072)!==0&&(Ae=!0);else return n.lanes=e.lanes,Bn(e,n,t)}return us(e,n,r,l,t)}function qd(e,n,r){var l=n.pendingProps,t=l.children,u=e!==null?e.memoizedState:null;if(l.mode==="hidden")if((n.mode&1)===0)n.memoizedState={baseLanes:0,cachePool:null,transitions:null},se(cl,qe),qe|=r;else{if((r&1073741824)===0)return e=u!==null?u.baseLanes|r:r,n.lanes=n.childLanes=1073741824,n.memoizedState={baseLanes:e,cachePool:null,transitions:null},n.updateQueue=null,se(cl,qe),qe|=e,null;n.memoizedState={baseLanes:0,cachePool:null,transitions:null},l=u!==null?u.baseLanes:r,se(cl,qe),qe|=l}else u!==null?(l=u.baseLanes|r,n.memoizedState=null):l=r,se(cl,qe),qe|=l;return Qe(e,n,t,r),n.child}function bd(e,n){var r=n.ref;if(e===null&&r!==null||e!==null&&e.ref!==r)n.flags|=512,n.flags|=2097152}function us(e,n,r,l,t){var u=Ye(r)?Ir:je.current;if(u=yl(n,u),ml(n,t),r=Ks(e,n,r,l,u,t),l=Ys(),e!==null&&!Ae)return n.updateQueue=e.updateQueue,n.flags&=-2053,e.lanes&=~t,Bn(e,n,t);return de&&l&&Fs(n),n.flags|=1,Qe(e,n,r,t),n.child}function df(e,n,r,l,t){if(Ye(r)){var u=!0;Gu(n)}else u=!1;if(ml(n,t),n.stateNode===null)Ou(e,n),Zd(n,r,l),ls(n,r,l,t),l=!0;else if(e===null){var{stateNode:i,memoizedProps:o}=n;i.props=o;var s=i.context,c=r.contextType;typeof c==="object"&&c!==null?c=an(c):(c=Ye(r)?Ir:je.current,c=yl(n,c));var d=r.getDerivedStateFromProps,a=typeof d==="function"||typeof i.getSnapshotBeforeUpdate==="function";a||typeof i.UNSAFE_componentWillReceiveProps!=="function"&&typeof i.componentWillReceiveProps!=="function"||(o!==l||s!==c)&&uf(n,i,l,c),bn=!1;var v=n.memoizedState;i.state=v,ei(n,l,i,t),s=n.memoizedState,o!==l||v!==s||Ke.current||bn?(typeof d==="function"&&(rs(n,r,d,l),s=n.memoizedState),(o=bn||tf(n,r,o,l,v,s,c))?(a||typeof i.UNSAFE_componentWillMount!=="function"&&typeof i.componentWillMount!=="function"||(typeof i.componentWillMount==="function"&&i.componentWillMount(),typeof i.UNSAFE_componentWillMount==="function"&&i.UNSAFE_componentWillMount()),typeof i.componentDidMount==="function"&&(n.flags|=4194308)):(typeof i.componentDidMount==="function"&&(n.flags|=4194308),n.memoizedProps=l,n.memoizedState=s),i.props=l,i.state=s,i.context=c,l=o):(typeof i.componentDidMount==="function"&&(n.flags|=4194308),l=!1)}else{i=n.stateNode,zd(e,n),o=n.memoizedProps,c=n.type===n.elementType?o:hn(n.type,o),i.props=c,a=n.pendingProps,v=i.context,s=r.contextType,typeof s==="object"&&s!==null?s=an(s):(s=Ye(r)?Ir:je.current,s=yl(n,s));var h=r.getDerivedStateFromProps;(d=typeof h==="function"||typeof i.getSnapshotBeforeUpdate==="function")||typeof i.UNSAFE_componentWillReceiveProps!=="function"&&typeof i.componentWillReceiveProps!=="function"||(o!==a||v!==s)&&uf(n,i,l,s),bn=!1,v=n.memoizedState,i.state=v,ei(n,l,i,t);var g=n.memoizedState;o!==a||v!==g||Ke.current||bn?(typeof h==="function"&&(rs(n,r,h,l),g=n.memoizedState),(c=bn||tf(n,r,c,l,v,g,s)||!1)?(d||typeof i.UNSAFE_componentWillUpdate!=="function"&&typeof i.componentWillUpdate!=="function"||(typeof i.componentWillUpdate==="function"&&i.componentWillUpdate(l,g,s),typeof i.UNSAFE_componentWillUpdate==="function"&&i.UNSAFE_componentWillUpdate(l,g,s)),typeof i.componentDidUpdate==="function"&&(n.flags|=4),typeof i.getSnapshotBeforeUpdate==="function"&&(n.flags|=1024)):(typeof i.componentDidUpdate!=="function"||o===e.memoizedProps&&v===e.memoizedState||(n.flags|=4),typeof i.getSnapshotBeforeUpdate!=="function"||o===e.memoizedProps&&v===e.memoizedState||(n.flags|=1024),n.memoizedProps=l,n.memoizedState=g),i.props=l,i.state=g,i.context=s,l=c):(typeof i.componentDidUpdate!=="function"||o===e.memoizedProps&&v===e.memoizedState||(n.flags|=4),typeof i.getSnapshotBeforeUpdate!=="function"||o===e.memoizedProps&&v===e.memoizedState||(n.flags|=1024),l=!1)}return is(e,n,r,l,u,t)}function is(e,n,r,l,t,u){bd(e,n);var i=(n.flags&128)!==0;if(!l&&!i)return t&&Ja(n,r,!1),Bn(e,n,u);l=n.stateNode,mv.current=n;var o=i&&typeof r.getDerivedStateFromError!=="function"?null:l.render();return n.flags|=1,e!==null&&i?(n.child=wl(n,e.child,null,u),n.child=wl(n,null,o,u)):Qe(e,n,o,u),n.memoizedState=l.state,t&&Ja(n,r,!0),n.child}function ep(e){var n=e.stateNode;n.pendingContext?Ga(e,n.pendingContext,n.pendingContext!==n.context):n.context&&Ga(e,n.context,!1),Bs(e,n.containerInfo)}function pf(e,n,r,l,t){return gl(),Ms(t),n.flags|=256,Qe(e,n,r,l),n.child}var os={dehydrated:null,treeContext:null,retryLane:0};function ss(e){return{baseLanes:e,cachePool:null,transitions:null}}function np(e,n,r){var l=n.pendingProps,t=he.current,u=!1,i=(n.flags&128)!==0,o;if((o=i)||(o=e!==null&&e.memoizedState===null?!1:(t&2)!==0),o)u=!0,n.flags&=-129;else if(e===null||e.memoizedState!==null)t|=1;if(se(he,t&1),e===null){if(es(n),e=n.memoizedState,e!==null&&(e=e.dehydrated,e!==null))return(n.mode&1)===0?n.lanes=1:e.data==="$!"?n.lanes=8:n.lanes=1073741824,null;return i=l.children,e=l.fallback,u?(l=n.mode,u=n.child,i={mode:"hidden",children:i},(l&1)===0&&u!==null?(u.childLanes=0,u.pendingProps=i):u=wi(i,l,0,null),e=Dr(e,l,r,null),u.return=n,e.return=n,u.sibling=e,n.child=u,n.child.memoizedState=ss(r),n.memoizedState=os,e):Js(n,i)}if(t=e.memoizedState,t!==null&&(o=t.dehydrated,o!==null))return vv(e,n,i,l,o,t,r);if(u){u=l.fallback,i=n.mode,t=e.child,o=t.sibling;var s={mode:"hidden",children:l.children};return(i&1)===0&&n.child!==t?(l=n.child,l.childLanes=0,l.pendingProps=s,n.deletions=null):(l=fr(t,s),l.subtreeFlags=t.subtreeFlags&14680064),o!==null?u=fr(o,u):(u=Dr(u,i,r,null),u.flags|=2),u.return=n,l.return=n,l.sibling=u,n.child=l,l=u,u=n.child,i=e.child.memoizedState,i=i===null?ss(r):{baseLanes:i.baseLanes|r,cachePool:null,transitions:i.transitions},u.memoizedState=i,u.childLanes=e.childLanes&~r,n.memoizedState=os,l}return u=e.child,e=u.sibling,l=fr(u,{mode:"visible",children:l.children}),(n.mode&1)===0&&(l.lanes=r),l.return=n,l.sibling=null,e!==null&&(r=n.deletions,r===null?(n.deletions=[e],n.flags|=16):r.push(e)),n.child=l,n.memoizedState=null,l}function Js(e,n){return n=wi({mode:"visible",children:n},e.mode,0,null),n.return=e,e.child=n}function Pu(e,n,r,l){return l!==null&&Ms(l),wl(n,e.child,null,r),e=Js(n,n.pendingProps.children),e.flags|=2,n.memoizedState=null,e}function vv(e,n,r,l,t,u,i){if(r){if(n.flags&256)return n.flags&=-257,l=ko(Error(_(422))),Pu(e,n,i,l);if(n.memoizedState!==null)return n.child=e.child,n.flags|=128,null;return u=l.fallback,t=n.mode,l=wi({mode:"visible",children:l.children},t,0,null),u=Dr(u,t,i,null),u.flags|=2,l.return=n,u.return=n,l.sibling=u,n.child=l,(n.mode&1)!==0&&wl(n,e.child,null,i),n.child.memoizedState=ss(i),n.memoizedState=os,u}if((n.mode&1)===0)return Pu(e,n,i,null);if(t.data==="$!"){if(l=t.nextSibling&&t.nextSibling.dataset,l)var o=l.dgst;return l=o,u=Error(_(419)),l=ko(u,l,void 0),Pu(e,n,i,l)}if(o=(i&e.childLanes)!==0,Ae||o){if(l=Te,l!==null){switch(i&-i){case 4:t=2;break;case 16:t=8;break;case 64:case 128:case 256:case 512:case 1024:case 2048:case 4096:case 8192:case 16384:case 32768:case 65536:case 131072:case 262144:case 524288:case 1048576:case 2097152:case 4194304:case 8388608:case 16777216:case 33554432:case 67108864:t=32;break;case 536870912:t=268435456;break;default:t=0}t=(t&(l.suspendedLanes|i))!==0?0:t,t!==0&&t!==u.retryLane&&(u.retryLane=t,Hn(e,t),kn(l,e,t,-1))}return rc(),l=ko(Error(_(421))),Pu(e,n,i,l)}if(t.data==="$?")return n.flags|=128,n.child=e.child,n=Lv.bind(null,e),t._reactRetry=n,null;return e=u.treeContext,be=or(t.nextSibling),en=n,de=!0,gn=null,e!==null&&(un[on++]=Mn,un[on++]=Un,un[on++]=Rr,Mn=e.id,Un=e.overflow,Rr=n),n=Js(n,l.children),n.flags|=4096,n}function mf(e,n,r){e.lanes|=n;var l=e.alternate;l!==null&&(l.lanes|=n),ns(e.return,n,r)}function So(e,n,r,l,t){var u=e.memoizedState;u===null?e.memoizedState={isBackwards:n,rendering:null,renderingStartTime:0,last:l,tail:r,tailMode:t}:(u.isBackwards=n,u.rendering=null,u.renderingStartTime=0,u.last=l,u.tail=r,u.tailMode=t)}function rp(e,n,r){var l=n.pendingProps,t=l.revealOrder,u=l.tail;if(Qe(e,n,l.children,r),l=he.current,(l&2)!==0)l=l&1|2,n.flags|=128;else{if(e!==null&&(e.flags&128)!==0)e:for(e=n.child;e!==null;){if(e.tag===13)e.memoizedState!==null&&mf(e,r,n);else if(e.tag===19)mf(e,r,n);else if(e.child!==null){e.child.return=e,e=e.child;continue}if(e===n)break e;for(;e.sibling===null;){if(e.return===null||e.return===n)break e;e=e.return}e.sibling.return=e.return,e=e.sibling}l&=1}if(se(he,l),(n.mode&1)===0)n.memoizedState=null;else switch(t){case"forwards":r=n.child;for(t=null;r!==null;)e=r.alternate,e!==null&&ni(e)===null&&(t=r),r=r.sibling;r=t,r===null?(t=n.child,n.child=null):(t=r.sibling,r.sibling=null),So(n,!1,t,r,u);break;case"backwards":r=null,t=n.child;for(n.child=null;t!==null;){if(e=t.alternate,e!==null&&ni(e)===null){n.child=t;break}e=t.sibling,t.sibling=r,r=t,t=e}So(n,!0,r,null,u);break;case"together":So(n,!1,null,null,void 0);break;default:n.memoizedState=null}return n.child}function Ou(e,n){(n.mode&1)===0&&e!==null&&(e.alternate=null,n.alternate=null,n.flags|=2)}function Bn(e,n,r){if(e!==null&&(n.dependencies=e.dependencies),Or|=n.lanes,(r&n.childLanes)===0)return null;if(e!==null&&n.child!==e.child)throw Error(_(153));if(n.child!==null){e=n.child,r=fr(e,e.pendingProps),n.child=r;for(r.return=n;e.sibling!==null;)e=e.sibling,r=r.sibling=fr(e,e.pendingProps),r.return=n;r.sibling=null}return n.child}function hv(e,n,r){switch(n.tag){case 3:ep(n),gl();break;case 5:Ld(n);break;case 1:Ye(n.type)&&Gu(n);break;case 4:Bs(n,n.stateNode.containerInfo);break;case 10:var l=n.type._context,t=n.memoizedProps.value;se(qu,l._currentValue),l._currentValue=t;break;case 13:if(l=n.memoizedState,l!==null){if(l.dehydrated!==null)return se(he,he.current&1),n.flags|=128,null;if((r&n.child.childLanes)!==0)return np(e,n,r);return se(he,he.current&1),e=Bn(e,n,r),e!==null?e.sibling:null}se(he,he.current&1);break;case 19:if(l=(r&n.childLanes)!==0,(e.flags&128)!==0){if(l)return rp(e,n,r);n.flags|=128}if(t=n.memoizedState,t!==null&&(t.rendering=null,t.tail=null,t.lastEffect=null),se(he,he.current),l)break;else return null;case 22:case 23:return n.lanes=0,qd(e,n,r)}return Bn(e,n,r)}var lp,cs,tp,up;lp=function(e,n){for(var r=n.child;r!==null;){if(r.tag===5||r.tag===6)e.appendChild(r.stateNode);else if(r.tag!==4&&r.child!==null){r.child.return=r,r=r.child;continue}if(r===n)break;for(;r.sibling===null;){if(r.return===null||r.return===n)return;r=r.return}r.sibling.return=r.return,r=r.sibling}};cs=function(){};tp=function(e,n,r,l){var t=e.memoizedProps;if(t!==l){e=n.stateNode,xr(xn.current);var u=null;switch(r){case"input":t=xo(e,t),l=xo(e,l),u=[];break;case"select":t=ge({},t,{value:void 0}),l=ge({},l,{value:void 0}),u=[];break;case"textarea":t=Io(e,t),l=Io(e,l),u=[];break;default:typeof t.onClick!=="function"&&typeof l.onClick==="function"&&(e.onclick=Yu)}Fo(r,l);var i;r=null;for(c in t)if(!l.hasOwnProperty(c)&&t.hasOwnProperty(c)&&t[c]!=null)if(c==="style"){var o=t[c];for(i in o)o.hasOwnProperty(i)&&(r||(r={}),r[i]="")}else c!=="dangerouslySetInnerHTML"&&c!=="children"&&c!=="suppressContentEditableWarning"&&c!=="suppressHydrationWarning"&&c!=="autoFocus"&&(vt.hasOwnProperty(c)?u||(u=[]):(u=u||[]).push(c,null));for(c in l){var s=l[c];if(o=t!=null?t[c]:void 0,l.hasOwnProperty(c)&&s!==o&&(s!=null||o!=null))if(c==="style")if(o){for(i in o)!o.hasOwnProperty(i)||s&&s.hasOwnProperty(i)||(r||(r={}),r[i]="");for(i in s)s.hasOwnProperty(i)&&o[i]!==s[i]&&(r||(r={}),r[i]=s[i])}else r||(u||(u=[]),u.push(c,r)),r=s;else c==="dangerouslySetInnerHTML"?(s=s?s.__html:void 0,o=o?o.__html:void 0,s!=null&&o!==s&&(u=u||[]).push(c,s)):c==="children"?typeof s!=="string"&&typeof s!=="number"||(u=u||[]).push(c,""+s):c!=="suppressContentEditableWarning"&&c!=="suppressHydrationWarning"&&(vt.hasOwnProperty(c)?(s!=null&&c==="onScroll"&&ae("scroll",e),u||o===s||(u=[])):(u=u||[]).push(c,s))}r&&(u=u||[]).push("style",r);var c=u;if(n.updateQueue=c)n.flags|=4}};up=function(e,n,r,l){r!==l&&(n.flags|=4)};function Jl(e,n){if(!de)switch(e.tailMode){case"hidden":n=e.tail;for(var r=null;n!==null;)n.alternate!==null&&(r=n),n=n.sibling;r===null?e.tail=null:r.sibling=null;break;case"collapsed":r=e.tail;for(var l=null;r!==null;)r.alternate!==null&&(l=r),r=r.sibling;l===null?n||e.tail===null?e.tail=null:e.tail.sibling=null:l.sibling=null}}function Me(e){var n=e.alternate!==null&&e.alternate.child===e.child,r=0,l=0;if(n)for(var t=e.child;t!==null;)r|=t.lanes|t.childLanes,l|=t.subtreeFlags&14680064,l|=t.flags&14680064,t.return=e,t=t.sibling;else for(t=e.child;t!==null;)r|=t.lanes|t.childLanes,l|=t.subtreeFlags,l|=t.flags,t.return=e,t=t.sibling;return e.subtreeFlags|=l,e.childLanes=r,n}function yv(e,n,r){var l=n.pendingProps;switch(Os(n),n.tag){case 2:case 16:case 15:case 0:case 11:case 7:case 8:case 12:case 9:case 14:return Me(n),null;case 1:return Ye(n.type)&&Zu(),Me(n),null;case 3:if(l=n.stateNode,kl(),fe(Ke),fe(je),$s(),l.pendingContext&&(l.context=l.pendingContext,l.pendingContext=null),e===null||e.child===null)Cu(n)?n.flags|=4:e===null||e.memoizedState.isDehydrated&&(n.flags&256)===0||(n.flags|=1024,gn!==null&&(ys(gn),gn=null));return cs(e,n),Me(n),null;case 5:Ws(n);var t=xr(zt.current);if(r=n.type,e!==null&&n.stateNode!=null)tp(e,n,r,l,t),e.ref!==n.ref&&(n.flags|=512,n.flags|=2097152);else{if(!l){if(n.stateNode===null)throw Error(_(166));return Me(n),null}if(e=xr(xn.current),Cu(n)){l=n.stateNode,r=n.type;var u=n.memoizedProps;switch(l[zn]=n,l[Pt]=u,e=(n.mode&1)!==0,r){case"dialog":ae("cancel",l),ae("close",l);break;case"iframe":case"object":case"embed":ae("load",l);break;case"video":case"audio":for(t=0;t<ut.length;t++)ae(ut[t],l);break;case"source":ae("error",l);break;case"img":case"image":case"link":ae("error",l),ae("load",l);break;case"details":ae("toggle",l);break;case"input":Ca(l,u),ae("invalid",l);break;case"select":l._wrapperState={wasMultiple:!!u.multiple},ae("invalid",l);break;case"textarea":Pa(l,u),ae("invalid",l)}Fo(r,u),t=null;for(var i in u)if(u.hasOwnProperty(i)){var o=u[i];i==="children"?typeof o==="string"?l.textContent!==o&&(u.suppressHydrationWarning!==!0&&Eu(l.textContent,o,e),t=["children",o]):typeof o==="number"&&l.textContent!==""+o&&(u.suppressHydrationWarning!==!0&&Eu(l.textContent,o,e),t=["children",""+o]):vt.hasOwnProperty(i)&&o!=null&&i==="onScroll"&&ae("scroll",l)}switch(r){case"input":mu(l),Na(l,u,!0);break;case"textarea":mu(l),_a(l);break;case"select":case"option":break;default:typeof u.onClick==="function"&&(l.onclick=Yu)}l=t,n.updateQueue=l,l!==null&&(n.flags|=4)}else{i=t.nodeType===9?t:t.ownerDocument,e==="http://www.w3.org/1999/xhtml"&&(e=Rf(r)),e==="http://www.w3.org/1999/xhtml"?r==="script"?(e=i.createElement("div"),e.innerHTML="<script></script>",e=e.removeChild(e.firstChild)):typeof l.is==="string"?e=i.createElement(r,{is:l.is}):(e=i.createElement(r),r==="select"&&(i=e,l.multiple?i.multiple=!0:l.size&&(i.size=l.size))):e=i.createElementNS(e,r),e[zn]=n,e[Pt]=l,lp(e,n,!1,!1),n.stateNode=e;e:{switch(i=Oo(r,l),r){case"dialog":ae("cancel",e),ae("close",e),t=l;break;case"iframe":case"object":case"embed":ae("load",e),t=l;break;case"video":case"audio":for(t=0;t<ut.length;t++)ae(ut[t],e);t=l;break;case"source":ae("error",e),t=l;break;case"img":case"image":case"link":ae("error",e),ae("load",e),t=l;break;case"details":ae("toggle",e),t=l;break;case"input":Ca(e,l),t=xo(e,l),ae("invalid",e);break;case"option":t=l;break;case"select":e._wrapperState={wasMultiple:!!l.multiple},t=ge({},l,{value:void 0}),ae("invalid",e);break;case"textarea":Pa(e,l),t=Io(e,l),ae("invalid",e);break;default:t=l}Fo(r,t),o=t;for(u in o)if(o.hasOwnProperty(u)){var s=o[u];u==="style"?Mf(e,s):u==="dangerouslySetInnerHTML"?(s=s?s.__html:void 0,s!=null&&Ff(e,s)):u==="children"?typeof s==="string"?(r!=="textarea"||s!=="")&&ht(e,s):typeof s==="number"&&ht(e,""+s):u!=="suppressContentEditableWarning"&&u!=="suppressHydrationWarning"&&u!=="autoFocus"&&(vt.hasOwnProperty(u)?s!=null&&u==="onScroll"&&ae("scroll",e):s!=null&&ks(e,u,s,i))}switch(r){case"input":mu(e),Na(e,l,!1);break;case"textarea":mu(e),_a(e);break;case"option":l.value!=null&&e.setAttribute("value",""+dr(l.value));break;case"select":e.multiple=!!l.multiple,u=l.value,u!=null?al(e,!!l.multiple,u,!1):l.defaultValue!=null&&al(e,!!l.multiple,l.defaultValue,!0);break;default:typeof t.onClick==="function"&&(e.onclick=Yu)}switch(r){case"button":case"input":case"select":case"textarea":l=!!l.autoFocus;break e;case"img":l=!0;break e;default:l=!1}}l&&(n.flags|=4)}n.ref!==null&&(n.flags|=512,n.flags|=2097152)}return Me(n),null;case 6:if(e&&n.stateNode!=null)up(e,n,e.memoizedProps,l);else{if(typeof l!=="string"&&n.stateNode===null)throw Error(_(166));if(r=xr(zt.current),xr(xn.current),Cu(n)){if(l=n.stateNode,r=n.memoizedProps,l[zn]=n,u=l.nodeValue!==r){if(e=en,e!==null)switch(e.tag){case 3:Eu(l.nodeValue,r,(e.mode&1)!==0);break;case 5:e.memoizedProps.suppressHydrationWarning!==!0&&Eu(l.nodeValue,r,(e.mode&1)!==0)}}u&&(n.flags|=4)}else l=(r.nodeType===9?r:r.ownerDocument).createTextNode(l),l[zn]=n,n.stateNode=l}return Me(n),null;case 13:if(fe(he),l=n.memoizedState,e===null||e.memoizedState!==null&&e.memoizedState.dehydrated!==null){if(de&&be!==null&&(n.mode&1)!==0&&(n.flags&128)===0)Cd(),gl(),n.flags|=98560,u=!1;else if(u=Cu(n),l!==null&&l.dehydrated!==null){if(e===null){if(!u)throw Error(_(318));if(u=n.memoizedState,u=u!==null?u.dehydrated:null,!u)throw Error(_(317));u[zn]=n}else gl(),(n.flags&128)===0&&(n.memoizedState=null),n.flags|=4;Me(n),u=!1}else gn!==null&&(ys(gn),gn=null),u=!0;if(!u)return n.flags&65536?n:null}if((n.flags&128)!==0)return n.lanes=r,n;return l=l!==null,l!==(e!==null&&e.memoizedState!==null)&&l&&(n.child.flags|=8192,(n.mode&1)!==0&&(e===null||(he.current&1)!==0?ze===0&&(ze=3):rc())),n.updateQueue!==null&&(n.flags|=4),Me(n),null;case 4:return kl(),cs(e,n),e===null&&Ct(n.stateNode.containerInfo),Me(n),null;case 10:return Vs(n.type._context),Me(n),null;case 17:return Ye(n.type)&&Zu(),Me(n),null;case 19:if(fe(he),u=n.memoizedState,u===null)return Me(n),null;if(l=(n.flags&128)!==0,i=u.rendering,i===null)if(l)Jl(u,!1);else{if(ze!==0||e!==null&&(e.flags&128)!==0)for(e=n.child;e!==null;){if(i=ni(e),i!==null){n.flags|=128,Jl(u,!1),l=i.updateQueue,l!==null&&(n.updateQueue=l,n.flags|=4),n.subtreeFlags=0,l=r;for(r=n.child;r!==null;)u=r,e=l,u.flags&=14680066,i=u.alternate,i===null?(u.childLanes=0,u.lanes=e,u.child=null,u.subtreeFlags=0,u.memoizedProps=null,u.memoizedState=null,u.updateQueue=null,u.dependencies=null,u.stateNode=null):(u.childLanes=i.childLanes,u.lanes=i.lanes,u.child=i.child,u.subtreeFlags=0,u.deletions=null,u.memoizedProps=i.memoizedProps,u.memoizedState=i.memoizedState,u.updateQueue=i.updateQueue,u.type=i.type,e=i.dependencies,u.dependencies=e===null?null:{lanes:e.lanes,firstContext:e.firstContext}),r=r.sibling;return se(he,he.current&1|2),n.child}e=e.sibling}u.tail!==null&&Ne()>El&&(n.flags|=128,l=!0,Jl(u,!1),n.lanes=4194304)}else{if(!l)if(e=ni(i),e!==null){if(n.flags|=128,l=!0,r=e.updateQueue,r!==null&&(n.updateQueue=r,n.flags|=4),Jl(u,!0),u.tail===null&&u.tailMode==="hidden"&&!i.alternate&&!de)return Me(n),null}else 2*Ne()-u.renderingStartTime>El&&r!==1073741824&&(n.flags|=128,l=!0,Jl(u,!1),n.lanes=4194304);u.isBackwards?(i.sibling=n.child,n.child=i):(r=u.last,r!==null?r.sibling=i:n.child=i,u.last=i)}if(u.tail!==null)return n=u.tail,u.rendering=n,u.tail=n.sibling,u.renderingStartTime=Ne(),n.sibling=null,r=he.current,se(he,l?r&1|2:r&1),n;return Me(n),null;case 22:case 23:return nc(),l=n.memoizedState!==null,e!==null&&e.memoizedState!==null!==l&&(n.flags|=8192),l&&(n.mode&1)!==0?(qe&1073741824)!==0&&(Me(n),n.subtreeFlags&6&&(n.flags|=8192)):Me(n),null;case 24:return null;case 25:return null}throw Error(_(156,n.tag))}function gv(e,n){switch(Os(n),n.tag){case 1:return Ye(n.type)&&Zu(),e=n.flags,e&65536?(n.flags=e&-65537|128,n):null;case 3:return kl(),fe(Ke),fe(je),$s(),e=n.flags,(e&65536)!==0&&(e&128)===0?(n.flags=e&-65537|128,n):null;case 5:return Ws(n),null;case 13:if(fe(he),e=n.memoizedState,e!==null&&e.dehydrated!==null){if(n.alternate===null)throw Error(_(340));gl()}return e=n.flags,e&65536?(n.flags=e&-65537|128,n):null;case 19:return fe(he),null;case 4:return kl(),null;case 10:return Vs(n.type._context),null;case 22:case 23:return nc(),null;case 24:return null;default:return null}}var _u=!1,Ue=!1,wv=typeof WeakSet==="function"?WeakSet:Set,D=null;function sl(e,n){var r=e.ref;if(r!==null)if(typeof r==="function")try{r(null)}catch(l){Ee(e,n,l)}else r.current=null}function as(e,n,r){try{r()}catch(l){Ee(e,n,l)}}var vf=!1;function kv(e,n){if(Yo=$u,e=ad(),Rs(e)){if("selectionStart"in e)var r={start:e.selectionStart,end:e.selectionEnd};else e:{r=(r=e.ownerDocument)&&r.defaultView||window;var l=r.getSelection&&r.getSelection();if(l&&l.rangeCount!==0){r=l.anchorNode;var{anchorOffset:t,focusNode:u}=l;l=l.focusOffset;try{r.nodeType,u.nodeType}catch(w){r=null;break e}var i=0,o=-1,s=-1,c=0,d=0,a=e,v=null;n:for(;;){for(var h;;){if(a!==r||t!==0&&a.nodeType!==3||(o=i+t),a!==u||l!==0&&a.nodeType!==3||(s=i+l),a.nodeType===3&&(i+=a.nodeValue.length),(h=a.firstChild)===null)break;v=a,a=h}for(;;){if(a===e)break n;if(v===r&&++c===t&&(o=i),v===u&&++d===l&&(s=i),(h=a.nextSibling)!==null)break;a=v,v=a.parentNode}a=h}r=o===-1||s===-1?null:{start:o,end:s}}else r=null}r=r||{start:0,end:0}}else r=null;Zo={focusedElem:e,selectionRange:r},$u=!1;for(D=n;D!==null;)if(n=D,e=n.child,(n.subtreeFlags&1028)!==0&&e!==null)e.return=n,D=e;else for(;D!==null;){n=D;try{var g=n.alternate;if((n.flags&1024)!==0)switch(n.tag){case 0:case 11:case 15:break;case 1:if(g!==null){var{memoizedProps:y,memoizedState:S}=g,m=n.stateNode,f=m.getSnapshotBeforeUpdate(n.elementType===n.type?y:hn(n.type,y),S);m.__reactInternalSnapshotBeforeUpdate=f}break;case 3:var p=n.stateNode.containerInfo;p.nodeType===1?p.textContent="":p.nodeType===9&&p.documentElement&&p.removeChild(p.documentElement);break;case 5:case 6:case 4:case 17:break;default:throw Error(_(163))}}catch(w){Ee(n,n.return,w)}if(e=n.sibling,e!==null){e.return=n.return,D=e;break}D=n.return}return g=vf,vf=!1,g}function dt(e,n,r){var l=n.updateQueue;if(l=l!==null?l.lastEffect:null,l!==null){var t=l=l.next;do{if((t.tag&e)===e){var u=t.destroy;t.destroy=void 0,u!==void 0&&as(n,r,u)}t=t.next}while(t!==l)}}function yi(e,n){if(n=n.updateQueue,n=n!==null?n.lastEffect:null,n!==null){var r=n=n.next;do{if((r.tag&e)===e){var l=r.create;r.destroy=l()}r=r.next}while(r!==n)}}function fs(e){var n=e.ref;if(n!==null){var r=e.stateNode;switch(e.tag){case 5:e=r;break;default:e=r}typeof n==="function"?n(e):n.current=e}}function ip(e){var n=e.alternate;n!==null&&(e.alternate=null,ip(n)),e.child=null,e.deletions=null,e.sibling=null,e.tag===5&&(n=e.stateNode,n!==null&&(delete n[zn],delete n[Pt],delete n[Xo],delete n[rv],delete n[lv])),e.stateNode=null,e.return=null,e.dependencies=null,e.memoizedProps=null,e.memoizedState=null,e.pendingProps=null,e.stateNode=null,e.updateQueue=null}function op(e){return e.tag===5||e.tag===3||e.tag===4}function hf(e){e:for(;;){for(;e.sibling===null;){if(e.return===null||op(e.return))return null;e=e.return}e.sibling.return=e.return;for(e=e.sibling;e.tag!==5&&e.tag!==6&&e.tag!==18;){if(e.flags&2)continue e;if(e.child===null||e.tag===4)continue e;else e.child.return=e,e=e.child}if(!(e.flags&2))return e.stateNode}}function ds(e,n,r){var l=e.tag;if(l===5||l===6)e=e.stateNode,n?r.nodeType===8?r.parentNode.insertBefore(e,n):r.insertBefore(e,n):(r.nodeType===8?(n=r.parentNode,n.insertBefore(e,r)):(n=r,n.appendChild(e)),r=r._reactRootContainer,r!==null&&r!==void 0||n.onclick!==null||(n.onclick=Yu));else if(l!==4&&(e=e.child,e!==null))for(ds(e,n,r),e=e.sibling;e!==null;)ds(e,n,r),e=e.sibling}function ps(e,n,r){var l=e.tag;if(l===5||l===6)e=e.stateNode,n?r.insertBefore(e,n):r.appendChild(e);else if(l!==4&&(e=e.child,e!==null))for(ps(e,n,r),e=e.sibling;e!==null;)ps(e,n,r),e=e.sibling}var De=null,yn=!1;function Xn(e,n,r){for(r=r.child;r!==null;)sp(e,n,r),r=r.sibling}function sp(e,n,r){if(Ln&&typeof Ln.onCommitFiberUnmount==="function")try{Ln.onCommitFiberUnmount(ci,r)}catch(o){}switch(r.tag){case 5:Ue||sl(r,n);case 6:var l=De,t=yn;De=null,Xn(e,n,r),De=l,yn=t,De!==null&&(yn?(e=De,r=r.stateNode,e.nodeType===8?e.parentNode.removeChild(r):e.removeChild(r)):De.removeChild(r.stateNode));break;case 18:De!==null&&(yn?(e=De,r=r.stateNode,e.nodeType===8?mo(e.parentNode,r):e.nodeType===1&&mo(e,r),kt(e)):mo(De,r.stateNode));break;case 4:l=De,t=yn,De=r.stateNode.containerInfo,yn=!0,Xn(e,n,r),De=l,yn=t;break;case 0:case 11:case 14:case 15:if(!Ue&&(l=r.updateQueue,l!==null&&(l=l.lastEffect,l!==null))){t=l=l.next;do{var u=t,i=u.destroy;u=u.tag,i!==void 0&&((u&2)!==0?as(r,n,i):(u&4)!==0&&as(r,n,i)),t=t.next}while(t!==l)}Xn(e,n,r);break;case 1:if(!Ue&&(sl(r,n),l=r.stateNode,typeof l.componentWillUnmount==="function"))try{l.props=r.memoizedProps,l.state=r.memoizedState,l.componentWillUnmount()}catch(o){Ee(r,n,o)}Xn(e,n,r);break;case 21:Xn(e,n,r);break;case 22:r.mode&1?(Ue=(l=Ue)||r.memoizedState!==null,Xn(e,n,r),Ue=l):Xn(e,n,r);break;default:Xn(e,n,r)}}function yf(e){var n=e.updateQueue;if(n!==null){e.updateQueue=null;var r=e.stateNode;r===null&&(r=e.stateNode=new wv),n.forEach(function(l){var t=xv.bind(null,e,l);r.has(l)||(r.add(l),l.then(t,t))})}}function vn(e,n){var r=n.deletions;if(r!==null)for(var l=0;l<r.length;l++){var t=r[l];try{var u=e,i=n,o=i;e:for(;o!==null;){switch(o.tag){case 5:De=o.stateNode,yn=!1;break e;case 3:De=o.stateNode.containerInfo,yn=!0;break e;case 4:De=o.stateNode.containerInfo,yn=!0;break e}o=o.return}if(De===null)throw Error(_(160));sp(u,i,t),De=null,yn=!1;var s=t.alternate;s!==null&&(s.return=null),t.return=null}catch(c){Ee(t,n,c)}}if(n.subtreeFlags&12854)for(n=n.child;n!==null;)cp(n,e),n=n.sibling}function cp(e,n){var{alternate:r,flags:l}=e;switch(e.tag){case 0:case 11:case 14:case 15:if(vn(n,e),Pn(e),l&4){try{dt(3,e,e.return),yi(3,e)}catch(y){Ee(e,e.return,y)}try{dt(5,e,e.return)}catch(y){Ee(e,e.return,y)}}break;case 1:vn(n,e),Pn(e),l&512&&r!==null&&sl(r,r.return);break;case 5:if(vn(n,e),Pn(e),l&512&&r!==null&&sl(r,r.return),e.flags&32){var t=e.stateNode;try{ht(t,"")}catch(y){Ee(e,e.return,y)}}if(l&4&&(t=e.stateNode,t!=null)){var u=e.memoizedProps,i=r!==null?r.memoizedProps:u,o=e.type,s=e.updateQueue;if(e.updateQueue=null,s!==null)try{o==="input"&&u.type==="radio"&&u.name!=null&&Df(t,u),Oo(o,i);var c=Oo(o,u);for(i=0;i<s.length;i+=2){var d=s[i],a=s[i+1];d==="style"?Mf(t,a):d==="dangerouslySetInnerHTML"?Ff(t,a):d==="children"?ht(t,a):ks(t,d,a,c)}switch(o){case"input":To(t,u);break;case"textarea":If(t,u);break;case"select":var v=t._wrapperState.wasMultiple;t._wrapperState.wasMultiple=!!u.multiple;var h=u.value;h!=null?al(t,!!u.multiple,h,!1):v!==!!u.multiple&&(u.defaultValue!=null?al(t,!!u.multiple,u.defaultValue,!0):al(t,!!u.multiple,u.multiple?[]:"",!1))}t[Pt]=u}catch(y){Ee(e,e.return,y)}}break;case 6:if(vn(n,e),Pn(e),l&4){if(e.stateNode===null)throw Error(_(162));t=e.stateNode,u=e.memoizedProps;try{t.nodeValue=u}catch(y){Ee(e,e.return,y)}}break;case 3:if(vn(n,e),Pn(e),l&4&&r!==null&&r.memoizedState.isDehydrated)try{kt(n.containerInfo)}catch(y){Ee(e,e.return,y)}break;case 4:vn(n,e),Pn(e);break;case 13:vn(n,e),Pn(e),t=e.child,t.flags&8192&&(u=t.memoizedState!==null,t.stateNode.isHidden=u,!u||t.alternate!==null&&t.alternate.memoizedState!==null||(bs=Ne())),l&4&&yf(e);break;case 22:if(d=r!==null&&r.memoizedState!==null,e.mode&1?(Ue=(c=Ue)||d,vn(n,e),Ue=c):vn(n,e),Pn(e),l&8192){if(c=e.memoizedState!==null,(e.stateNode.isHidden=c)&&!d&&(e.mode&1)!==0)for(D=e,d=e.child;d!==null;){for(a=D=d;D!==null;){switch(v=D,h=v.child,v.tag){case 0:case 11:case 14:case 15:dt(4,v,v.return);break;case 1:sl(v,v.return);var g=v.stateNode;if(typeof g.componentWillUnmount==="function"){l=v,r=v.return;try{n=l,g.props=n.memoizedProps,g.state=n.memoizedState,g.componentWillUnmount()}catch(y){Ee(l,r,y)}}break;case 5:sl(v,v.return);break;case 22:if(v.memoizedState!==null){wf(a);continue}}h!==null?(h.return=v,D=h):wf(a)}d=d.sibling}e:for(d=null,a=e;;){if(a.tag===5){if(d===null){d=a;try{t=a.stateNode,c?(u=t.style,typeof u.setProperty==="function"?u.setProperty("display","none","important"):u.display="none"):(o=a.stateNode,s=a.memoizedProps.style,i=s!==void 0&&s!==null&&s.hasOwnProperty("display")?s.display:null,o.style.display=Of("display",i))}catch(y){Ee(e,e.return,y)}}}else if(a.tag===6){if(d===null)try{a.stateNode.nodeValue=c?"":a.memoizedProps}catch(y){Ee(e,e.return,y)}}else if((a.tag!==22&&a.tag!==23||a.memoizedState===null||a===e)&&a.child!==null){a.child.return=a,a=a.child;continue}if(a===e)break e;for(;a.sibling===null;){if(a.return===null||a.return===e)break e;d===a&&(d=null),a=a.return}d===a&&(d=null),a.sibling.return=a.return,a=a.sibling}}break;case 19:vn(n,e),Pn(e),l&4&&yf(e);break;case 21:break;default:vn(n,e),Pn(e)}}function Pn(e){var n=e.flags;if(n&2){try{e:{for(var r=e.return;r!==null;){if(op(r)){var l=r;break e}r=r.return}throw Error(_(160))}switch(l.tag){case 5:var t=l.stateNode;l.flags&32&&(ht(t,""),l.flags&=-33);var u=hf(e);ps(e,u,t);break;case 3:case 4:var i=l.stateNode.containerInfo,o=hf(e);ds(e,o,i);break;default:throw Error(_(161))}}catch(s){Ee(e,e.return,s)}e.flags&=-3}n&4096&&(e.flags&=-4097)}function Sv(e,n,r){D=e,ap(e,n,r)}function ap(e,n,r){for(var l=(e.mode&1)!==0;D!==null;){var t=D,u=t.child;if(t.tag===22&&l){var i=t.memoizedState!==null||_u;if(!i){var o=t.alternate,s=o!==null&&o.memoizedState!==null||Ue;o=_u;var c=Ue;if(_u=i,(Ue=s)&&!c)for(D=t;D!==null;)i=D,s=i.child,i.tag===22&&i.memoizedState!==null?kf(t):s!==null?(s.return=i,D=s):kf(t);for(;u!==null;)D=u,ap(u,n,r),u=u.sibling;D=t,_u=o,Ue=c}gf(e,n,r)}else(t.subtreeFlags&8772)!==0&&u!==null?(u.return=t,D=u):gf(e,n,r)}}function gf(e){for(;D!==null;){var n=D;if((n.flags&8772)!==0){var r=n.alternate;try{if((n.flags&8772)!==0)switch(n.tag){case 0:case 11:case 15:Ue||yi(5,n);break;case 1:var l=n.stateNode;if(n.flags&4&&!Ue)if(r===null)l.componentDidMount();else{var t=n.elementType===n.type?r.memoizedProps:hn(n.type,r.memoizedProps);l.componentDidUpdate(t,r.memoizedState,l.__reactInternalSnapshotBeforeUpdate)}var u=n.updateQueue;u!==null&&nf(n,u,l);break;case 3:var i=n.updateQueue;if(i!==null){if(r=null,n.child!==null)switch(n.child.tag){case 5:r=n.child.stateNode;break;case 1:r=n.child.stateNode}nf(n,i,r)}break;case 5:var o=n.stateNode;if(r===null&&n.flags&4){r=o;var s=n.memoizedProps;switch(n.type){case"button":case"input":case"select":case"textarea":s.autoFocus&&r.focus();break;case"img":s.src&&(r.src=s.src)}}break;case 6:break;case 4:break;case 12:break;case 13:if(n.memoizedState===null){var c=n.alternate;if(c!==null){var d=c.memoizedState;if(d!==null){var a=d.dehydrated;a!==null&&kt(a)}}}break;case 19:case 17:case 21:case 22:case 23:case 25:break;default:throw Error(_(163))}Ue||n.flags&512&&fs(n)}catch(v){Ee(n,n.return,v)}}if(n===e){D=null;break}if(r=n.sibling,r!==null){r.return=n.return,D=r;break}D=n.return}}function wf(e){for(;D!==null;){var n=D;if(n===e){D=null;break}var r=n.sibling;if(r!==null){r.return=n.return,D=r;break}D=n.return}}function kf(e){for(;D!==null;){var n=D;try{switch(n.tag){case 0:case 11:case 15:var r=n.return;try{yi(4,n)}catch(s){Ee(n,r,s)}break;case 1:var l=n.stateNode;if(typeof l.componentDidMount==="function"){var t=n.return;try{l.componentDidMount()}catch(s){Ee(n,t,s)}}var u=n.return;try{fs(n)}catch(s){Ee(n,u,s)}break;case 5:var i=n.return;try{fs(n)}catch(s){Ee(n,i,s)}}}catch(s){Ee(n,n.return,s)}if(n===e){D=null;break}var o=n.sibling;if(o!==null){o.return=n.return,D=o;break}D=n.return}}var Ev=Math.ceil,ti=Wn.ReactCurrentDispatcher,Xs=Wn.ReactCurrentOwner,cn=Wn.ReactCurrentBatchConfig,ee=0,Te=null,Pe=null,Ie=0,qe=0,cl=vr(0),ze=0,Dt=null,Or=0,gi=0,qs=0,pt=null,$e=null,bs=0,El=1/0,Fn=null,ui=!1,ms=null,cr=null,zu=!1,lr=null,ii=0,mt=0,vs=null,Mu=-1,Uu=0;function He(){return(ee&6)!==0?Ne():Mu!==-1?Mu:Mu=Ne()}function ar(e){if((e.mode&1)===0)return 1;if((ee&2)!==0&&Ie!==0)return Ie&-Ie;if(uv.transition!==null)return Uu===0&&(Uu=Zf()),Uu;if(e=te,e!==0)return e;return e=window.event,e=e===void 0?16:nd(e.type),e}function kn(e,n,r,l){if(50<mt)throw mt=0,vs=null,Error(_(185));if(It(e,r,l),(ee&2)===0||e!==Te)e===Te&&((ee&2)===0&&(gi|=r),ze===4&&nr(e,Ie)),Ze(e,l),r===1&&ee===0&&(n.mode&1)===0&&(El=Ne()+500,mi&&hr())}function Ze(e,n){var r=e.callbackNode;o1(e,n);var l=Wu(e,e===Te?Ie:0);if(l===0)r!==null&&xa(r),e.callbackNode=null,e.callbackPriority=0;else if(n=l&-l,e.callbackPriority!==n){if(r!=null&&xa(r),n===1)e.tag===0?tv(Sf.bind(null,e)):kd(Sf.bind(null,e)),ev(function(){(ee&6)===0&&hr()}),r=null;else{switch(Gf(l)){case 1:r=Ps;break;case 4:r=Kf;break;case 16:r=Bu;break;case 536870912:r=Yf;break;default:r=Bu}r=gp(r,fp.bind(null,e))}e.callbackPriority=n,e.callbackNode=r}}function fp(e,n){if(Mu=-1,Uu=0,(ee&6)!==0)throw Error(_(327));var r=e.callbackNode;if(vl()&&e.callbackNode!==r)return null;var l=Wu(e,e===Te?Ie:0);if(l===0)return null;if((l&30)!==0||(l&e.expiredLanes)!==0||n)n=oi(e,l);else{n=l;var t=ee;ee|=2;var u=pp();if(Te!==e||Ie!==n)Fn=null,El=Ne()+500,Tr(e,n);do try{Pv();break}catch(o){dp(e,o)}while(1);js(),ti.current=u,ee=t,Pe!==null?n=0:(Te=null,Ie=0,n=ze)}if(n!==0){if(n===2&&(t=Qo(e),t!==0&&(l=t,n=hs(e,t))),n===1)throw r=Dt,Tr(e,0),nr(e,l),Ze(e,Ne()),r;if(n===6)nr(e,l);else{if(t=e.current.alternate,(l&30)===0&&!Cv(t)&&(n=oi(e,l),n===2&&(u=Qo(e),u!==0&&(l=u,n=hs(e,u))),n===1))throw r=Dt,Tr(e,0),nr(e,l),Ze(e,Ne()),r;switch(e.finishedWork=t,e.finishedLanes=l,n){case 0:case 1:throw Error(_(345));case 2:_r(e,$e,Fn);break;case 3:if(nr(e,l),(l&130023424)===l&&(n=bs+500-Ne(),10<n)){if(Wu(e,0)!==0)break;if(t=e.suspendedLanes,(t&l)!==l){He(),e.pingedLanes|=e.suspendedLanes&t;break}e.timeoutHandle=Jo(_r.bind(null,e,$e,Fn),n);break}_r(e,$e,Fn);break;case 4:if(nr(e,l),(l&4194240)===l)break;n=e.eventTimes;for(t=-1;0<l;){var i=31-wn(l);u=1<<i,i=n[i],i>t&&(t=i),l&=~u}if(l=t,l=Ne()-l,l=(120>l?120:480>l?480:1080>l?1080:1920>l?1920:3000>l?3000:4320>l?4320:1960*Ev(l/1960))-l,10<l){e.timeoutHandle=Jo(_r.bind(null,e,$e,Fn),l);break}_r(e,$e,Fn);break;case 5:_r(e,$e,Fn);break;default:throw Error(_(329))}}}return Ze(e,Ne()),e.callbackNode===r?fp.bind(null,e):null}function hs(e,n){var r=pt;return e.current.memoizedState.isDehydrated&&(Tr(e,n).flags|=256),e=oi(e,n),e!==2&&(n=$e,$e=r,n!==null&&ys(n)),e}function ys(e){$e===null?$e=e:$e.push.apply($e,e)}function Cv(e){for(var n=e;;){if(n.flags&16384){var r=n.updateQueue;if(r!==null&&(r=r.stores,r!==null))for(var l=0;l<r.length;l++){var t=r[l],u=t.getSnapshot;t=t.value;try{if(!Sn(u(),t))return!1}catch(i){return!1}}}if(r=n.child,n.subtreeFlags&16384&&r!==null)r.return=n,n=r;else{if(n===e)break;for(;n.sibling===null;){if(n.return===null||n.return===e)return!0;n=n.return}n.sibling.return=n.return,n=n.sibling}}return!0}function nr(e,n){n&=~qs,n&=~gi,e.suspendedLanes|=n,e.pingedLanes&=~n;for(e=e.expirationTimes;0<n;){var r=31-wn(n),l=1<<r;e[r]=-1,n&=~l}}function Sf(e){if((ee&6)!==0)throw Error(_(327));vl();var n=Wu(e,0);if((n&1)===0)return Ze(e,Ne()),null;var r=oi(e,n);if(e.tag!==0&&r===2){var l=Qo(e);l!==0&&(n=l,r=hs(e,l))}if(r===1)throw r=Dt,Tr(e,0),nr(e,n),Ze(e,Ne()),r;if(r===6)throw Error(_(345));return e.finishedWork=e.current.alternate,e.finishedLanes=n,_r(e,$e,Fn),Ze(e,Ne()),null}function ec(e,n){var r=ee;ee|=1;try{return e(n)}finally{ee=r,ee===0&&(El=Ne()+500,mi&&hr())}}function Mr(e){lr!==null&&lr.tag===0&&(ee&6)===0&&vl();var n=ee;ee|=1;var r=cn.transition,l=te;try{if(cn.transition=null,te=1,e)return e()}finally{te=l,cn.transition=r,ee=n,(ee&6)===0&&hr()}}function nc(){qe=cl.current,fe(cl)}function Tr(e,n){e.finishedWork=null,e.finishedLanes=0;var r=e.timeoutHandle;if(r!==-1&&(e.timeoutHandle=-1,b1(r)),Pe!==null)for(r=Pe.return;r!==null;){var l=r;switch(Os(l),l.tag){case 1:l=l.type.childContextTypes,l!==null&&l!==void 0&&Zu();break;case 3:kl(),fe(Ke),fe(je),$s();break;case 5:Ws(l);break;case 4:kl();break;case 13:fe(he);break;case 19:fe(he);break;case 10:Vs(l.type._context);break;case 22:case 23:nc()}r=r.return}if(Te=e,Pe=e=fr(e.current,null),Ie=qe=n,ze=0,Dt=null,qs=gi=Or=0,$e=pt=null,Lr!==null){for(n=0;n<Lr.length;n++)if(r=Lr[n],l=r.interleaved,l!==null){r.interleaved=null;var t=l.next,u=r.pending;if(u!==null){var i=u.next;u.next=t,l.next=i}r.pending=l}Lr=null}return e}function dp(e,n){do{var r=Pe;try{if(js(),Ru.current=li,ri){for(var l=ye.memoizedState;l!==null;){var t=l.queue;t!==null&&(t.pending=null),l=l.next}ri=!1}if(Fr=0,xe=_e=ye=null,ft=!1,Lt=0,Xs.current=null,r===null||r.return===null){ze=1,Dt=n,Pe=null;break}e:{var u=e,i=r.return,o=r,s=n;if(n=Ie,o.flags|=32768,s!==null&&typeof s==="object"&&typeof s.then==="function"){var c=s,d=o,a=d.tag;if((d.mode&1)===0&&(a===0||a===11||a===15)){var v=d.alternate;v?(d.updateQueue=v.updateQueue,d.memoizedState=v.memoizedState,d.lanes=v.lanes):(d.updateQueue=null,d.memoizedState=null)}var h=sf(i);if(h!==null){h.flags&=-257,cf(h,i,o,u,n),h.mode&1&&of(u,c,n),n=h,s=c;var g=n.updateQueue;if(g===null){var y=new Set;y.add(s),n.updateQueue=y}else g.add(s);break e}else{if((n&1)===0){of(u,c,n),rc();break e}s=Error(_(426))}}else if(de&&o.mode&1){var S=sf(i);if(S!==null){(S.flags&65536)===0&&(S.flags|=256),cf(S,i,o,u,n),Ms(Sl(s,o));break e}}u=s=Sl(s,o),ze!==4&&(ze=2),pt===null?pt=[u]:pt.push(u),u=i;do{switch(u.tag){case 3:u.flags|=65536,n&=-n,u.lanes|=n;var m=Gd(u,s,n);ef(u,m);break e;case 1:o=s;var{type:f,stateNode:p}=u;if((u.flags&128)===0&&(typeof f.getDerivedStateFromError==="function"||p!==null&&typeof p.componentDidCatch==="function"&&(cr===null||!cr.has(p)))){u.flags|=65536,n&=-n,u.lanes|=n;var w=Jd(u,o,n);ef(u,w);break e}}u=u.return}while(u!==null)}vp(r)}catch(k){n=k,Pe===r&&r!==null&&(Pe=r=r.return);continue}break}while(1)}function pp(){var e=ti.current;return ti.current=li,e===null?li:e}function rc(){if(ze===0||ze===3||ze===2)ze=4;Te===null||(Or&268435455)===0&&(gi&268435455)===0||nr(Te,Ie)}function oi(e,n){var r=ee;ee|=2;var l=pp();if(Te!==e||Ie!==n)Fn=null,Tr(e,n);do try{Nv();break}catch(t){dp(e,t)}while(1);if(js(),ee=r,ti.current=l,Pe!==null)throw Error(_(261));return Te=null,Ie=0,ze}function Nv(){for(;Pe!==null;)mp(Pe)}function Pv(){for(;Pe!==null&&!qm();)mp(Pe)}function mp(e){var n=yp(e.alternate,e,qe);e.memoizedProps=e.pendingProps,n===null?vp(e):Pe=n,Xs.current=null}function vp(e){var n=e;do{var r=n.alternate;if(e=n.return,(n.flags&32768)===0){if(r=yv(r,n,qe),r!==null){Pe=r;return}}else{if(r=gv(r,n),r!==null){r.flags&=32767,Pe=r;return}if(e!==null)e.flags|=32768,e.subtreeFlags=0,e.deletions=null;else{ze=6,Pe=null;return}}if(n=n.sibling,n!==null){Pe=n;return}Pe=n=e}while(n!==null);ze===0&&(ze=5)}function _r(e,n,r){var l=te,t=cn.transition;try{cn.transition=null,te=1,_v(e,n,r,l)}finally{cn.transition=t,te=l}return null}function _v(e,n,r,l){do vl();while(lr!==null);if((ee&6)!==0)throw Error(_(327));r=e.finishedWork;var t=e.finishedLanes;if(r===null)return null;if(e.finishedWork=null,e.finishedLanes=0,r===e.current)throw Error(_(177));e.callbackNode=null,e.callbackPriority=0;var u=r.lanes|r.childLanes;if(s1(e,u),e===Te&&(Pe=Te=null,Ie=0),(r.subtreeFlags&2064)===0&&(r.flags&2064)===0||zu||(zu=!0,gp(Bu,function(){return vl(),null})),u=(r.flags&15990)!==0,(r.subtreeFlags&15990)!==0||u){u=cn.transition,cn.transition=null;var i=te;te=1;var o=ee;ee|=4,Xs.current=null,kv(e,r),cp(r,e),Z1(Zo),$u=!!Yo,Zo=Yo=null,e.current=r,Sv(r,e,t),bm(),ee=o,te=i,cn.transition=u}else e.current=r;if(zu&&(zu=!1,lr=e,ii=t),u=e.pendingLanes,u===0&&(cr=null),r1(r.stateNode,l),Ze(e,Ne()),n!==null)for(l=e.onRecoverableError,r=0;r<n.length;r++)t=n[r],l(t.value,{componentStack:t.stack,digest:t.digest});if(ui)throw ui=!1,e=ms,ms=null,e;return(ii&1)!==0&&e.tag!==0&&vl(),u=e.pendingLanes,(u&1)!==0?e===vs?mt++:(mt=0,vs=e):mt=0,hr(),null}function vl(){if(lr!==null){var e=Gf(ii),n=cn.transition,r=te;try{if(cn.transition=null,te=16>e?16:e,lr===null)var l=!1;else{if(e=lr,lr=null,ii=0,(ee&6)!==0)throw Error(_(331));var t=ee;ee|=4;for(D=e.current;D!==null;){var u=D,i=u.child;if((D.flags&16)!==0){var o=u.deletions;if(o!==null){for(var s=0;s<o.length;s++){var c=o[s];for(D=c;D!==null;){var d=D;switch(d.tag){case 0:case 11:case 15:dt(8,d,u)}var a=d.child;if(a!==null)a.return=d,D=a;else for(;D!==null;){d=D;var{sibling:v,return:h}=d;if(ip(d),d===c){D=null;break}if(v!==null){v.return=h,D=v;break}D=h}}}var g=u.alternate;if(g!==null){var y=g.child;if(y!==null){g.child=null;do{var S=y.sibling;y.sibling=null,y=S}while(y!==null)}}D=u}}if((u.subtreeFlags&2064)!==0&&i!==null)i.return=u,D=i;else e:for(;D!==null;){if(u=D,(u.flags&2048)!==0)switch(u.tag){case 0:case 11:case 15:dt(9,u,u.return)}var m=u.sibling;if(m!==null){m.return=u.return,D=m;break e}D=u.return}}var f=e.current;for(D=f;D!==null;){i=D;var p=i.child;if((i.subtreeFlags&2064)!==0&&p!==null)p.return=i,D=p;else e:for(i=f;D!==null;){if(o=D,(o.flags&2048)!==0)try{switch(o.tag){case 0:case 11:case 15:yi(9,o)}}catch(k){Ee(o,o.return,k)}if(o===i){D=null;break e}var w=o.sibling;if(w!==null){w.return=o.return,D=w;break e}D=o.return}}if(ee=t,hr(),Ln&&typeof Ln.onPostCommitFiberRoot==="function")try{Ln.onPostCommitFiberRoot(ci,e)}catch(k){}l=!0}return l}finally{te=r,cn.transition=n}}return!1}function Ef(e,n,r){n=Sl(r,n),n=Gd(e,n,1),e=sr(e,n,1),n=He(),e!==null&&(It(e,1,n),Ze(e,n))}function Ee(e,n,r){if(e.tag===3)Ef(e,e,r);else for(;n!==null;){if(n.tag===3){Ef(n,e,r);break}else if(n.tag===1){var l=n.stateNode;if(typeof n.type.getDerivedStateFromError==="function"||typeof l.componentDidCatch==="function"&&(cr===null||!cr.has(l))){e=Sl(r,e),e=Jd(n,e,1),n=sr(n,e,1),e=He(),n!==null&&(It(n,1,e),Ze(n,e));break}}n=n.return}}function zv(e,n,r){var l=e.pingCache;l!==null&&l.delete(n),n=He(),e.pingedLanes|=e.suspendedLanes&r,Te===e&&(Ie&r)===r&&(ze===4||ze===3&&(Ie&130023424)===Ie&&500>Ne()-bs?Tr(e,0):qs|=r),Ze(e,n)}function hp(e,n){n===0&&((e.mode&1)===0?n=1:(n=yu,yu<<=1,(yu&130023424)===0&&(yu=4194304)));var r=He();e=Hn(e,n),e!==null&&(It(e,n,r),Ze(e,r))}function Lv(e){var n=e.memoizedState,r=0;n!==null&&(r=n.retryLane),hp(e,r)}function xv(e,n){var r=0;switch(e.tag){case 13:var{stateNode:l,memoizedState:t}=e;t!==null&&(r=t.retryLane);break;case 19:l=e.stateNode;break;default:throw Error(_(314))}l!==null&&l.delete(n),hp(e,r)}var yp;yp=function(e,n,r){if(e!==null)if(e.memoizedProps!==n.pendingProps||Ke.current)Ae=!0;else{if((e.lanes&r)===0&&(n.flags&128)===0)return Ae=!1,hv(e,n,r);Ae=(e.flags&131072)!==0?!0:!1}else Ae=!1,de&&(n.flags&1048576)!==0&&Sd(n,Xu,n.index);switch(n.lanes=0,n.tag){case 2:var l=n.type;Ou(e,n),e=n.pendingProps;var t=yl(n,je.current);ml(n,r),t=Ks(null,n,l,e,t,r);var u=Ys();return n.flags|=1,typeof t==="object"&&t!==null&&typeof t.render==="function"&&t.$$typeof===void 0?(n.tag=1,n.memoizedState=null,n.updateQueue=null,Ye(l)?(u=!0,Gu(n)):u=!1,n.memoizedState=t.state!==null&&t.state!==void 0?t.state:null,Hs(n),t.updater=hi,n.stateNode=t,t._reactInternals=n,ls(n,l,e,r),n=is(null,n,l,!0,u,r)):(n.tag=0,de&&u&&Fs(n),Qe(null,n,t,r),n=n.child),n;case 16:l=n.elementType;e:{switch(Ou(e,n),e=n.pendingProps,t=l._init,l=t(l._payload),n.type=l,t=n.tag=Dv(l),e=hn(l,e),t){case 0:n=us(null,n,l,e,r);break e;case 1:n=df(null,n,l,e,r);break e;case 11:n=af(null,n,l,e,r);break e;case 14:n=ff(null,n,l,hn(l.type,e),r);break e}throw Error(_(306,l,""))}return n;case 0:return l=n.type,t=n.pendingProps,t=n.elementType===l?t:hn(l,t),us(e,n,l,t,r);case 1:return l=n.type,t=n.pendingProps,t=n.elementType===l?t:hn(l,t),df(e,n,l,t,r);case 3:e:{if(ep(n),e===null)throw Error(_(387));l=n.pendingProps,u=n.memoizedState,t=u.element,zd(e,n),ei(n,l,null,r);var i=n.memoizedState;if(l=i.element,u.isDehydrated)if(u={element:l,isDehydrated:!1,cache:i.cache,pendingSuspenseBoundaries:i.pendingSuspenseBoundaries,transitions:i.transitions},n.updateQueue.baseState=u,n.memoizedState=u,n.flags&256){t=Sl(Error(_(423)),n),n=pf(e,n,l,r,t);break e}else if(l!==t){t=Sl(Error(_(424)),n),n=pf(e,n,l,r,t);break e}else for(be=or(n.stateNode.containerInfo.firstChild),en=n,de=!0,gn=null,r=Pd(n,null,l,r),n.child=r;r;)r.flags=r.flags&-3|4096,r=r.sibling;else{if(gl(),l===t){n=Bn(e,n,r);break e}Qe(e,n,l,r)}n=n.child}return n;case 5:return Ld(n),e===null&&es(n),l=n.type,t=n.pendingProps,u=e!==null?e.memoizedProps:null,i=t.children,Go(l,t)?i=null:u!==null&&Go(l,u)&&(n.flags|=32),bd(e,n),Qe(e,n,i,r),n.child;case 6:return e===null&&es(n),null;case 13:return np(e,n,r);case 4:return Bs(n,n.stateNode.containerInfo),l=n.pendingProps,e===null?n.child=wl(n,null,l,r):Qe(e,n,l,r),n.child;case 11:return l=n.type,t=n.pendingProps,t=n.elementType===l?t:hn(l,t),af(e,n,l,t,r);case 7:return Qe(e,n,n.pendingProps,r),n.child;case 8:return Qe(e,n,n.pendingProps.children,r),n.child;case 12:return Qe(e,n,n.pendingProps.children,r),n.child;case 10:e:{if(l=n.type._context,t=n.pendingProps,u=n.memoizedProps,i=t.value,se(qu,l._currentValue),l._currentValue=i,u!==null)if(Sn(u.value,i)){if(u.children===t.children&&!Ke.current){n=Bn(e,n,r);break e}}else for(u=n.child,u!==null&&(u.return=n);u!==null;){var o=u.dependencies;if(o!==null){i=u.child;for(var s=o.firstContext;s!==null;){if(s.context===l){if(u.tag===1){s=jn(-1,r&-r),s.tag=2;var c=u.updateQueue;if(c!==null){c=c.shared;var d=c.pending;d===null?s.next=s:(s.next=d.next,d.next=s),c.pending=s}}u.lanes|=r,s=u.alternate,s!==null&&(s.lanes|=r),ns(u.return,r,n),o.lanes|=r;break}s=s.next}}else if(u.tag===10)i=u.type===n.type?null:u.child;else if(u.tag===18){if(i=u.return,i===null)throw Error(_(341));i.lanes|=r,o=i.alternate,o!==null&&(o.lanes|=r),ns(i,r,n),i=u.sibling}else i=u.child;if(i!==null)i.return=u;else for(i=u;i!==null;){if(i===n){i=null;break}if(u=i.sibling,u!==null){u.return=i.return,i=u;break}i=i.return}u=i}Qe(e,n,t.children,r),n=n.child}return n;case 9:return t=n.type,l=n.pendingProps.children,ml(n,r),t=an(t),l=l(t),n.flags|=1,Qe(e,n,l,r),n.child;case 14:return l=n.type,t=hn(l,n.pendingProps),t=hn(l.type,t),ff(e,n,l,t,r);case 15:return Xd(e,n,n.type,n.pendingProps,r);case 17:return l=n.type,t=n.pendingProps,t=n.elementType===l?t:hn(l,t),Ou(e,n),n.tag=1,Ye(l)?(e=!0,Gu(n)):e=!1,ml(n,r),Zd(n,l,t),ls(n,l,t,r),is(null,n,l,!0,e,r);case 19:return rp(e,n,r);case 22:return qd(e,n,r)}throw Error(_(156,n.tag))};function gp(e,n){return Af(e,n)}function Tv(e,n,r,l){this.tag=e,this.key=r,this.sibling=this.child=this.return=this.stateNode=this.type=this.elementType=null,this.index=0,this.ref=null,this.pendingProps=n,this.dependencies=this.memoizedState=this.updateQueue=this.memoizedProps=null,this.mode=l,this.subtreeFlags=this.flags=0,this.deletions=null,this.childLanes=this.lanes=0,this.alternate=null}function sn(e,n,r,l){return new Tv(e,n,r,l)}function lc(e){return e=e.prototype,!(!e||!e.isReactComponent)}function Dv(e){if(typeof e==="function")return lc(e)?1:0;if(e!==void 0&&e!==null){if(e=e.$$typeof,e===Es)return 11;if(e===Cs)return 14}return 2}function fr(e,n){var r=e.alternate;return r===null?(r=sn(e.tag,n,e.key,e.mode),r.elementType=e.elementType,r.type=e.type,r.stateNode=e.stateNode,r.alternate=e,e.alternate=r):(r.pendingProps=n,r.type=e.type,r.flags=0,r.subtreeFlags=0,r.deletions=null),r.flags=e.flags&14680064,r.childLanes=e.childLanes,r.lanes=e.lanes,r.child=e.child,r.memoizedProps=e.memoizedProps,r.memoizedState=e.memoizedState,r.updateQueue=e.updateQueue,n=e.dependencies,r.dependencies=n===null?null:{lanes:n.lanes,firstContext:n.firstContext},r.sibling=e.sibling,r.index=e.index,r.ref=e.ref,r}function ju(e,n,r,l,t,u){var i=2;if(l=e,typeof e==="function")lc(e)&&(i=1);else if(typeof e==="string")i=5;else e:switch(e){case br:return Dr(r.children,t,u,n);case Ss:i=8,t|=8;break;case Po:return e=sn(12,r,n,t|2),e.elementType=Po,e.lanes=u,e;case _o:return e=sn(13,r,n,t),e.elementType=_o,e.lanes=u,e;case zo:return e=sn(19,r,n,t),e.elementType=zo,e.lanes=u,e;case Lf:return wi(r,t,u,n);default:if(typeof e==="object"&&e!==null)switch(e.$$typeof){case _f:i=10;break e;case zf:i=9;break e;case Es:i=11;break e;case Cs:i=14;break e;case qn:i=16,l=null;break e}throw Error(_(130,e==null?e:typeof e,""))}return n=sn(i,r,n,t),n.elementType=e,n.type=l,n.lanes=u,n}function Dr(e,n,r,l){return e=sn(7,e,l,n),e.lanes=r,e}function wi(e,n,r,l){return e=sn(22,e,l,n),e.elementType=Lf,e.lanes=r,e.stateNode={isHidden:!1},e}function Eo(e,n,r){return e=sn(6,e,null,n),e.lanes=r,e}function Co(e,n,r){return n=sn(4,e.children!==null?e.children:[],e.key,n),n.lanes=r,n.stateNode={containerInfo:e.containerInfo,pendingChildren:null,implementation:e.implementation},n}function Iv(e,n,r,l,t){this.tag=n,this.containerInfo=e,this.finishedWork=this.pingCache=this.current=this.pendingChildren=null,this.timeoutHandle=-1,this.callbackNode=this.pendingContext=this.context=null,this.callbackPriority=0,this.eventTimes=io(0),this.expirationTimes=io(-1),this.entangledLanes=this.finishedLanes=this.mutableReadLanes=this.expiredLanes=this.pingedLanes=this.suspendedLanes=this.pendingLanes=0,this.entanglements=io(0),this.identifierPrefix=l,this.onRecoverableError=t,this.mutableSourceEagerHydrationData=null}function tc(e,n,r,l,t,u,i,o,s){return e=new Iv(e,n,r,o,s),n===1?(n=1,u===!0&&(n|=8)):n=0,u=sn(3,null,null,n),e.current=u,u.stateNode=e,u.memoizedState={element:l,isDehydrated:r,cache:null,transitions:null,pendingSuspenseBoundaries:null},Hs(u),e}function Rv(e,n,r){var l=3<arguments.length&&arguments[3]!==void 0?arguments[3]:null;return{$$typeof:qr,key:l==null?null:""+l,children:e,containerInfo:n,implementation:r}}function wp(e){if(!e)return pr;e=e._reactInternals;e:{if(jr(e)!==e||e.tag!==1)throw Error(_(170));var n=e;do{switch(n.tag){case 3:n=n.stateNode.context;break e;case 1:if(Ye(n.type)){n=n.stateNode.__reactInternalMemoizedMergedChildContext;break e}}n=n.return}while(n!==null);throw Error(_(171))}if(e.tag===1){var r=e.type;if(Ye(r))return wd(e,r,n)}return n}function kp(e,n,r,l,t,u,i,o,s){return e=tc(r,l,!0,e,t,u,i,o,s),e.context=wp(null),r=e.current,l=He(),t=ar(r),u=jn(l,t),u.callback=n!==void 0&&n!==null?n:null,sr(r,u,t),e.current.lanes=t,It(e,t,l),Ze(e,l),e}function ki(e,n,r,l){var t=n.current,u=He(),i=ar(t);return r=wp(r),n.context===null?n.context=r:n.pendingContext=r,n=jn(u,i),n.payload={element:e},l=l===void 0?null:l,l!==null&&(n.callback=l),e=sr(t,n,i),e!==null&&(kn(e,t,i,u),Iu(e,t,i)),i}function si(e){if(e=e.current,!e.child)return null;switch(e.child.tag){case 5:return e.child.stateNode;default:return e.child.stateNode}}function Cf(e,n){if(e=e.memoizedState,e!==null&&e.dehydrated!==null){var r=e.retryLane;e.retryLane=r!==0&&r<n?r:n}}function uc(e,n){Cf(e,n),(e=e.alternate)&&Cf(e,n)}function Fv(){return null}var Sp=typeof reportError==="function"?reportError:function(e){console.error(e)};function ic(e){this._internalRoot=e}Si.prototype.render=ic.prototype.render=function(e){var n=this._internalRoot;if(n===null)throw Error(_(409));ki(e,n,null,null)};Si.prototype.unmount=ic.prototype.unmount=function(){var e=this._internalRoot;if(e!==null){this._internalRoot=null;var n=e.containerInfo;Mr(function(){ki(null,e,null,null)}),n[Qn]=null}};function Si(e){this._internalRoot=e}Si.prototype.unstable_scheduleHydration=function(e){if(e){var n=qf();e={blockedOn:null,target:e,priority:n};for(var r=0;r<er.length&&n!==0&&n<er[r].priority;r++);er.splice(r,0,e),r===0&&ed(e)}};function oc(e){return!(!e||e.nodeType!==1&&e.nodeType!==9&&e.nodeType!==11)}function Ei(e){return!(!e||e.nodeType!==1&&e.nodeType!==9&&e.nodeType!==11&&(e.nodeType!==8||e.nodeValue!==" react-mount-point-unstable "))}function Nf(){}function Ov(e,n,r,l,t){if(t){if(typeof l==="function"){var u=l;l=function(){var c=si(i);u.call(c)}}var i=kp(n,l,e,0,null,!1,!1,"",Nf);return e._reactRootContainer=i,e[Qn]=i.current,Ct(e.nodeType===8?e.parentNode:e),Mr(),i}for(;t=e.lastChild;)e.removeChild(t);if(typeof l==="function"){var o=l;l=function(){var c=si(s);o.call(c)}}var s=tc(e,0,!1,null,null,!1,!1,"",Nf);return e._reactRootContainer=s,e[Qn]=s.current,Ct(e.nodeType===8?e.parentNode:e),Mr(function(){ki(n,s,r,l)}),s}function Ci(e,n,r,l,t){var u=r._reactRootContainer;if(u){var i=u;if(typeof t==="function"){var o=t;t=function(){var s=si(i);o.call(s)}}ki(n,i,e,t)}else i=Ov(r,n,e,t,l);return si(i)}Jf=function(e){switch(e.tag){case 3:var n=e.stateNode;if(n.current.memoizedState.isDehydrated){var r=et(n.pendingLanes);r!==0&&(_s(n,r|1),Ze(n,Ne()),(ee&6)===0&&(El=Ne()+500,hr()))}break;case 13:Mr(function(){var l=Hn(e,1);if(l!==null){var t=He();kn(l,e,1,t)}}),uc(e,1)}};zs=function(e){if(e.tag===13){var n=Hn(e,134217728);if(n!==null){var r=He();kn(n,e,134217728,r)}uc(e,134217728)}};Xf=function(e){if(e.tag===13){var n=ar(e),r=Hn(e,n);if(r!==null){var l=He();kn(r,e,n,l)}uc(e,n)}};qf=function(){return te};bf=function(e,n){var r=te;try{return te=e,n()}finally{te=r}};Uo=function(e,n,r){switch(n){case"input":if(To(e,r),n=r.name,r.type==="radio"&&n!=null){for(r=e;r.parentNode;)r=r.parentNode;r=r.querySelectorAll("input[name="+JSON.stringify(""+n)+'][type="radio"]');for(n=0;n<r.length;n++){var l=r[n];if(l!==e&&l.form===e.form){var t=pi(l);if(!t)throw Error(_(90));Tf(l),To(l,t)}}}break;case"textarea":If(e,r);break;case"select":n=r.value,n!=null&&al(e,!!r.multiple,n,!1)}};Vf=ec;Qf=Mr;var Mv={usingClientEntryPoint:!1,Events:[Ft,ll,pi,Uf,jf,ec]},Xl={findFiberByHostInstance:zr,bundleType:0,version:"18.3.1",rendererPackageName:"react-dom"},Uv={bundleType:Xl.bundleType,version:Xl.version,rendererPackageName:Xl.rendererPackageName,rendererConfig:Xl.rendererConfig,overrideHookState:null,overrideHookStateDeletePath:null,overrideHookStateRenamePath:null,overrideProps:null,overridePropsDeletePath:null,overridePropsRenamePath:null,setErrorHandler:null,setSuspenseHandler:null,scheduleUpdate:null,currentDispatcherRef:Wn.ReactCurrentDispatcher,findHostInstanceByFiber:function(e){return e=Wf(e),e===null?null:e.stateNode},findFiberByHostInstance:Xl.findFiberByHostInstance||Fv,findHostInstancesForRefresh:null,scheduleRefresh:null,scheduleRoot:null,setRefreshHandler:null,getCurrentFiber:null,reconcilerVersion:"18.3.1-next-f1338f8080-20240426"};if(typeof __REACT_DEVTOOLS_GLOBAL_HOOK__<"u"){if(Xr=__REACT_DEVTOOLS_GLOBAL_HOOK__,!Xr.isDisabled&&Xr.supportsFiber)try{ci=Xr.inject(Uv),Ln=Xr}catch(e){}}var Xr;ln.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED=Mv;ln.createPortal=function(e,n){var r=2<arguments.length&&arguments[2]!==void 0?arguments[2]:null;if(!oc(n))throw Error(_(200));return Rv(e,n,null,r)};ln.createRoot=function(e,n){if(!oc(e))throw Error(_(299));var r=!1,l="",t=Sp;return n!==null&&n!==void 0&&(n.unstable_strictMode===!0&&(r=!0),n.identifierPrefix!==void 0&&(l=n.identifierPrefix),n.onRecoverableError!==void 0&&(t=n.onRecoverableError)),n=tc(e,1,!1,null,null,r,!1,l,t),e[Qn]=n.current,Ct(e.nodeType===8?e.parentNode:e),new ic(n)};ln.findDOMNode=function(e){if(e==null)return null;if(e.nodeType===1)return e;var n=e._reactInternals;if(n===void 0){if(typeof e.render==="function")throw Error(_(188));throw e=Object.keys(e).join(","),Error(_(268,e))}return e=Wf(n),e=e===null?null:e.stateNode,e};ln.flushSync=function(e){return Mr(e)};ln.hydrate=function(e,n,r){if(!Ei(n))throw Error(_(200));return Ci(null,e,n,!0,r)};ln.hydrateRoot=function(e,n,r){if(!oc(e))throw Error(_(405));var l=r!=null&&r.hydratedSources||null,t=!1,u="",i=Sp;if(r!==null&&r!==void 0&&(r.unstable_strictMode===!0&&(t=!0),r.identifierPrefix!==void 0&&(u=r.identifierPrefix),r.onRecoverableError!==void 0&&(i=r.onRecoverableError)),n=kp(n,null,e,1,r!=null?r:null,t,!1,u,i),e[Qn]=n.current,Ct(e),l)for(e=0;e<l.length;e++)r=l[e],t=r._getVersion,t=t(r._source),n.mutableSourceEagerHydrationData==null?n.mutableSourceEagerHydrationData=[r,t]:n.mutableSourceEagerHydrationData.push(r,t);return new Si(n)};ln.render=function(e,n,r){if(!Ei(n))throw Error(_(200));return Ci(null,e,n,!1,r)};ln.unmountComponentAtNode=function(e){if(!Ei(e))throw Error(_(40));return e._reactRootContainer?(Mr(function(){Ci(null,null,e,!1,function(){e._reactRootContainer=null,e[Qn]=null})}),!0):!1};ln.unstable_batchedUpdates=ec;ln.unstable_renderSubtreeIntoContainer=function(e,n,r,l){if(!Ei(r))throw Error(_(200));if(e==null||e._reactInternals===void 0)throw Error(_(38));return Ci(e,n,r,!1,l)};ln.version="18.3.1-next-f1338f8080-20240426"});var sc=Rn((Kg,Np)=>{function Cp(){if(typeof __REACT_DEVTOOLS_GLOBAL_HOOK__>"u"||typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE!=="function")return;try{__REACT_DEVTOOLS_GLOBAL_HOOK__.checkDCE(Cp)}catch(e){console.error(e)}}Cp(),Np.exports=Ep()});var _p=Rn((cc)=>{var Pp=sc();cc.createRoot=Pp.createRoot,cc.hydrateRoot=Pp.hydrateRoot;var jv});var Lp=Rn((Ni)=>{var Vv=Gr(),Qv=Symbol.for("react.element"),Hv=Symbol.for("react.fragment"),Bv=Object.prototype.hasOwnProperty,Wv=Vv.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentOwner,$v={key:!0,ref:!0,__self:!0,__source:!0};function zp(e,n,r){var l,t={},u=null,i=null;r!==void 0&&(u=""+r),n.key!==void 0&&(u=""+n.key),n.ref!==void 0&&(i=n.ref);for(l in n)Bv.call(n,l)&&!$v.hasOwnProperty(l)&&(t[l]=n[l]);if(e&&e.defaultProps)for(l in n=e.defaultProps,n)t[l]===void 0&&(t[l]=n[l]);return{$$typeof:Qv,type:e,key:u,ref:i,props:t,_owner:Wv.current}}Ni.Fragment=Hv;Ni.jsx=zp;Ni.jsxs=zp});var Mt=Rn((Gg,xp)=>{xp.exports=Lp()});var am=In(Gr(),1),fm=In(_p(),1),dm=In(sc(),1);var Je=In(Mt(),1),J=In(Gr(),1);function Tp(e){let n=e.replace("#","");(n.length===3||n.length===4)&&(n=n.split("").map((l)=>l+l).join(""));let r=n.length>=8?parseInt(n.slice(6,8),16)/255:1;return[parseInt(n.slice(0,2),16)/255,parseInt(n.slice(2,4),16)/255,parseInt(n.slice(4,6),16)/255,r]}function g0(e,n,r){e/=255,n/=255,r/=255;let l=Math.max(e,n,r),t=Math.min(e,n,r),u=l-t,i=0,o=l===0?0:u/l;return u!==0&&(l===e?i=((n-r)/u+6)%6:l===n?i=(r-e)/u+2:i=(e-n)/u+4,i/=6),[i,o,l]}function w0(e,n,r){let l=Math.floor(e*6),t=e*6-l,u=r*(1-n),i=r*(1-t*n),o=r*(1-(1-t)*n),s=0,c=0,d=0;switch(l%6){case 0:s=r,c=o,d=u;break;case 1:s=i,c=r,d=u;break;case 2:s=u,c=r,d=o;break;case 3:s=u,c=i,d=r;break;case 4:s=o,c=u,d=r;break;case 5:s=r,c=u,d=i;break}return[Math.round(s*255),Math.round(c*255),Math.round(d*255)]}var Av=66,Kv=66,Yv=1500,Zv=1,Dp=16,Gv=96,Jv=2,Xv=0;var qv=1;var Ol={colorBack:"#00000000",speed:1,repetition:1.5,softness:0.05,shiftRed:0.3,shiftBlue:0.3,distortion:0.1,contour:0.4,angle:90,shape:Xv,scale:1,rotation:0,offsetX:0,offsetY:0,originX:0.5,originY:0.5,worldWidth:0,worldHeight:0,fit:qv},bv={name:"chromatic",modes:{dark:{...Ol,colorTint:"#88ccff2e",shiftRed:0.75,shiftBlue:0.75,repetition:2,softness:0.09,shaderOpacity:1},light:{...Ol,colorTint:"#66b0ff99",shiftRed:0.6,shiftBlue:0.6,shaderOpacity:1}}},eh={name:"silver",modes:{dark:{...Ol,colorTint:"#ffffff66",shaderOpacity:0.88},light:{...Ol,colorTint:"#ffffff40",shaderOpacity:1}}},nh={name:"gold",modes:{dark:{...Ol,colorTint:"#ffcc55cc",speed:0.85,shaderOpacity:0.92},light:{...Ol,colorTint:"#f7d488aa",shaderOpacity:1}}},k0={chromatic:bv,silver:eh,gold:nh},rh=`
#define TWO_PI 6.28318530718
#define PI 3.14159265358979323846
`,lh=`
vec2 rotate(vec2 uv, float th) {
  return mat2(cos(th), sin(th), -sin(th), cos(th)) * uv;
}
`,th=`
  color += 1. / 256. * (fract(sin(dot(.014 * gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453123) - .5);
`,uh=`
vec3 permute(vec3 x) { return mod(((x * 34.0) + 1.0) * x, 289.0); }
float snoise(vec2 v) {
  const vec4 C = vec4(0.211324865405187, 0.366025403784439,
    -0.577350269189626, 0.024390243902439);
  vec2 i = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1;
  i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod(i, 289.0);
  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0))
    + i.x + vec3(0.0, i1.x, 1.0));
  vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy),
      dot(x12.zw, x12.zw)), 0.0);
  m = m * m;
  m = m * m;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
  vec3 g;
  g.x = a0.x * x0.x + h.x * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}
`,ih=`#version 300 es
precision mediump float;

uniform sampler2D u_image;
uniform float u_imageAspectRatio;

uniform vec2 u_resolution;
uniform float u_time;

uniform vec4 u_colorBack;
uniform vec4 u_colorTint;

uniform float u_softness;
uniform float u_repetition;
uniform float u_shiftRed;
uniform float u_shiftBlue;
uniform float u_distortion;
uniform float u_contour;
uniform float u_angle;

uniform float u_shape;
uniform bool u_isImage;

in vec2 v_objectUV;
in vec2 v_responsiveUV;
in vec2 v_responsiveBoxGivenSize;
in vec2 v_imageUV;

out vec4 fragColor;

${rh}
${lh}
${uh}

float getColorChanges(float c1, float c2, float stripe_p, vec3 w, float blur, float bump, float tint) {

  float ch = mix(c2, c1, smoothstep(.0, 2. * blur, stripe_p));

  float border = w[0];
  ch = mix(ch, c2, smoothstep(border, border + 2. * blur, stripe_p));

  if (u_isImage == true) {
    bump = smoothstep(.2, .8, bump);
  }
  border = w[0] + .4 * (1. - bump) * w[1];
  ch = mix(ch, c1, smoothstep(border, border + 2. * blur, stripe_p));

  border = w[0] + .5 * (1. - bump) * w[1];
  ch = mix(ch, c2, smoothstep(border, border + 2. * blur, stripe_p));

  border = w[0] + w[1];
  ch = mix(ch, c1, smoothstep(border, border + 2. * blur, stripe_p));

  float gradient_t = (stripe_p - w[0] - w[1]) / w[2];
  float gradient = mix(c1, c2, smoothstep(0., 1., gradient_t));
  ch = mix(ch, gradient, smoothstep(border, border + .5 * blur, stripe_p));

  // Tint color is applied with color burn blending
  ch = mix(ch, 1. - min(1., (1. - ch) / max(tint, 0.0001)), u_colorTint.a);
  return ch;
}

float getImgFrame(vec2 uv, float th) {
  float frame = 1.;
  frame *= smoothstep(0., th, uv.y);
  frame *= 1.0 - smoothstep(1. - th, 1., uv.y);
  frame *= smoothstep(0., th, uv.x);
  frame *= 1.0 - smoothstep(1. - th, 1., uv.x);
  return frame;
}

float blurEdge3x3(sampler2D tex, vec2 uv, vec2 dudx, vec2 dudy, float radius, float centerSample) {
  vec2 texel = 1.0 / vec2(textureSize(tex, 0));
  vec2 r = radius * texel;

  float w1 = 1.0, w2 = 2.0, w4 = 4.0;
  float norm = 16.0;
  float sum = w4 * centerSample;

  sum += w2 * textureGrad(tex, uv + vec2(0.0, -r.y), dudx, dudy).r;
  sum += w2 * textureGrad(tex, uv + vec2(0.0, r.y), dudx, dudy).r;
  sum += w2 * textureGrad(tex, uv + vec2(-r.x, 0.0), dudx, dudy).r;
  sum += w2 * textureGrad(tex, uv + vec2(r.x, 0.0), dudx, dudy).r;

  sum += w1 * textureGrad(tex, uv + vec2(-r.x, -r.y), dudx, dudy).r;
  sum += w1 * textureGrad(tex, uv + vec2(r.x, -r.y), dudx, dudy).r;
  sum += w1 * textureGrad(tex, uv + vec2(-r.x, r.y), dudx, dudy).r;
  sum += w1 * textureGrad(tex, uv + vec2(r.x, r.y), dudx, dudy).r;

  return sum / norm;
}

float lst(float edge0, float edge1, float x) {
  return clamp((x - edge0) / (edge1 - edge0), 0.0, 1.0);
}

void main() {

  const float firstFrameOffset = 2.8;
  float t = .3 * (u_time + firstFrameOffset);

  vec2 uv = v_imageUV;
  vec2 dudx = dFdx(v_imageUV);
  vec2 dudy = dFdy(v_imageUV);
  vec4 img = textureGrad(u_image, uv, dudx, dudy);

  if (u_isImage == false) {
    uv = v_objectUV + .5;
    uv.y = 1. - uv.y;
  }

  float cycleWidth = u_repetition;
  float edge = 0.;
  float contOffset = 1.;

  vec2 rotatedUV = uv - vec2(.5);
  float angle = (-u_angle + 70.) * PI / 180.;
  float cosA = cos(angle);
  float sinA = sin(angle);
  rotatedUV = vec2(
  rotatedUV.x * cosA - rotatedUV.y * sinA,
  rotatedUV.x * sinA + rotatedUV.y * cosA
  ) + vec2(.5);

  if (u_isImage == true) {
    float edgeRaw = img.r;
    edge = blurEdge3x3(u_image, uv, dudx, dudy, 6., edgeRaw);
    edge = pow(edge, 1.6);
    edge *= mix(0.0, 1.0, smoothstep(0.0, 0.4, u_contour));
  } else {
    if (u_shape < 1.) {
      // full-fill on canvas
      vec2 borderUV = v_responsiveUV + .5;
      float ratio = v_responsiveBoxGivenSize.x / v_responsiveBoxGivenSize.y;
      vec2 mask = min(borderUV, 1. - borderUV);
      vec2 pixel_thickness = min(250. / v_responsiveBoxGivenSize, vec2(.5));
      float maskX = smoothstep(0.0, pixel_thickness.x, mask.x);
      float maskY = smoothstep(0.0, pixel_thickness.y, mask.y);
      maskX = pow(maskX, .25);
      maskY = pow(maskY, .25);
      edge = clamp(1. - maskX * maskY, 0., 1.);

      uv = v_responsiveUV;
      if (ratio > 1.) {
        uv.y /= ratio;
      } else {
        uv.x *= ratio;
      }
      uv += .5;
      uv.y = 1. - uv.y;

      cycleWidth *= 2.;
      contOffset = 1.5;

    } else if (u_shape < 2.) {
      // circle
      vec2 shapeUV = uv - .5;
      shapeUV *= .67;
      edge = pow(clamp(3. * length(shapeUV), 0., 1.), 18.);
    } else if (u_shape < 3.) {
      // daisy
      vec2 shapeUV = uv - .5;
      shapeUV *= 1.68;

      float r = length(shapeUV) * 2.;
      float a = atan(shapeUV.y, shapeUV.x) + .2;
      r *= (1. + .05 * sin(3. * a + 2. * t));
      float f = abs(cos(a * 3.));
      edge = smoothstep(f, f + .7, r);
      edge *= edge;

      uv *= .8;
      cycleWidth *= 1.6;

    } else if (u_shape < 4.) {
      // diamond
      vec2 shapeUV = uv - .5;
      shapeUV = rotate(shapeUV, .25 * PI);
      shapeUV *= 1.42;
      shapeUV += .5;
      vec2 mask = min(shapeUV, 1. - shapeUV);
      vec2 pixel_thickness = vec2(.15);
      float maskX = smoothstep(0.0, pixel_thickness.x, mask.x);
      float maskY = smoothstep(0.0, pixel_thickness.y, mask.y);
      maskX = pow(maskX, .25);
      maskY = pow(maskY, .25);
      edge = clamp(1. - maskX * maskY, 0., 1.);
    } else if (u_shape < 5.) {
      // metaballs
      vec2 shapeUV = uv - .5;
      shapeUV *= 1.3;
      edge = 0.;
      for (int i = 0; i < 5; i++) {
        float fi = float(i);
        float speed = 1.5 + 2./3. * sin(fi * 12.345);
        float angle = -fi * 1.5;
        vec2 dir1 = vec2(cos(angle), sin(angle));
        vec2 dir2 = vec2(cos(angle + 1.57), sin(angle + 1.));
        vec2 traj = .4 * (dir1 * sin(t * speed + fi * 1.23) + dir2 * cos(t * (speed * 0.7) + fi * 2.17));
        float d = length(shapeUV + traj);
        edge += pow(1.0 - clamp(d, 0.0, 1.0), 4.0);
      }
      edge = 1. - smoothstep(.65, .9, edge);
      edge = pow(edge, 4.);
    }

    edge = mix(smoothstep(.9 - 2. * fwidth(edge), .9, edge), edge, smoothstep(0.0, 0.4, u_contour));

  }

  float opacity = 0.;
  if (u_isImage == true) {
    opacity = img.g;
    float frame = getImgFrame(v_imageUV, 0.);
    opacity *= frame;
  } else {
    opacity = 1. - smoothstep(.9 - 2. * fwidth(edge), .9, edge);
    if (u_shape < 2.) {
      edge = 1.2 * edge;
    } else if (u_shape < 5.) {
      edge = 1.8 * pow(edge, 1.5);
    }
  }

  float diagBLtoTR = rotatedUV.x - rotatedUV.y;
  float diagTLtoBR = rotatedUV.x + rotatedUV.y;

  vec3 color = vec3(0.);
  vec3 color1 = vec3(.98, 0.98, 1.);
  vec3 color2 = vec3(.1, .1, .1 + .1 * smoothstep(.7, 1.3, diagTLtoBR));

  vec2 grad_uv = uv - .5;

  float dist = length(grad_uv + vec2(0., .2 * diagBLtoTR));
  grad_uv = rotate(grad_uv, (.25 - .2 * diagBLtoTR) * PI);
  float direction = grad_uv.x;

  float bump = pow(1.8 * dist, 1.2);
  bump = 1. - bump;
  bump *= pow(uv.y, .3);


  float thin_strip_1_ratio = .12 / cycleWidth * (1. - .4 * bump);
  float thin_strip_2_ratio = .07 / cycleWidth * (1. + .4 * bump);
  float wide_strip_ratio = (1. - thin_strip_1_ratio - thin_strip_2_ratio);

  float thin_strip_1_width = cycleWidth * thin_strip_1_ratio;
  float thin_strip_2_width = cycleWidth * thin_strip_2_ratio;

  float noise = snoise(uv - t);

  edge += (1. - edge) * u_distortion * noise;

  direction += diagBLtoTR;
  float contour = 0.;
  direction -= 2. * noise * diagBLtoTR * (smoothstep(0., 1., edge) * (1.0 - smoothstep(0., 1., edge)));
  direction *= mix(1., 1. - edge, smoothstep(.5, 1., u_contour));
  direction -= 1.7 * edge * smoothstep(.5, 1., u_contour);
  direction += .2 * pow(u_contour, 4.) * (1.0 - smoothstep(0., 1., edge));

  bump *= clamp(pow(uv.y, .1), .3, 1.);
  direction *= (.1 + (1.1 - edge) * bump);

  direction *= (.4 + .6 * (1.0 - smoothstep(.5, 1., edge)));
  direction += .18 * (smoothstep(.1, .2, uv.y) * (1.0 - smoothstep(.2, .4, uv.y)));
  direction += .03 * (smoothstep(.1, .2, 1. - uv.y) * (1.0 - smoothstep(.2, .4, 1. - uv.y)));

  direction *= (.5 + .5 * pow(uv.y, 2.));
  direction *= cycleWidth;
  direction -= t;


  float colorDispersion = (1. - bump);
  colorDispersion = clamp(colorDispersion, 0., 1.);
  float dispersionRed = colorDispersion;
  dispersionRed += .03 * bump * noise;
  dispersionRed += 5. * (smoothstep(-.1, .2, uv.y) * (1.0 - smoothstep(.1, .5, uv.y))) * (smoothstep(.4, .6, bump) * (1.0 - smoothstep(.4, 1., bump)));
  dispersionRed -= diagBLtoTR;

  float dispersionBlue = colorDispersion;
  dispersionBlue *= 1.3;
  dispersionBlue += (smoothstep(0., .4, uv.y) * (1.0 - smoothstep(.1, .8, uv.y))) * (smoothstep(.4, .6, bump) * (1.0 - smoothstep(.4, .8, bump)));
  dispersionBlue -= .2 * edge;

  dispersionRed *= (u_shiftRed / 20.);
  dispersionBlue *= (u_shiftBlue / 20.);

  float blur = 0.;
  float rExtraBlur = 0.;
  float gExtraBlur = 0.;
  if (u_isImage == true) {
    float softness = 0.05 * u_softness;
    blur = softness + .5 * smoothstep(1., 10., u_repetition) * smoothstep(.0, 1., edge);
    float smallCanvasT = 1.0 - smoothstep(100., 500., min(u_resolution.x, u_resolution.y));
    blur += smallCanvasT * smoothstep(.0, 1., edge);
    rExtraBlur = softness * (0.05 + .1 * (u_shiftRed / 20.) * bump);
    gExtraBlur = softness * 0.05 / max(0.001, abs(1. - diagBLtoTR));
  } else {
    blur = u_softness / 15. + .3 * contour;
  }

  vec3 w = vec3(thin_strip_1_width, thin_strip_2_width, wide_strip_ratio);
  w[1] -= .02 * smoothstep(.0, 1., edge + bump);
  float stripe_r = fract(direction + dispersionRed);
  float r = getColorChanges(color1.r, color2.r, stripe_r, w, blur + fwidth(stripe_r) + rExtraBlur, bump, u_colorTint.r);
  float stripe_g = fract(direction);
  float g = getColorChanges(color1.g, color2.g, stripe_g, w, blur + fwidth(stripe_g) + gExtraBlur, bump, u_colorTint.g);
  float stripe_b = fract(direction - dispersionBlue);
  float b = getColorChanges(color1.b, color2.b, stripe_b, w, blur + fwidth(stripe_b), bump, u_colorTint.b);

  color = vec3(r, g, b);
  color *= opacity;

  vec3 bgColor = u_colorBack.rgb * u_colorBack.a;
  color = color + bgColor * (1. - opacity);
  opacity = opacity + u_colorBack.a * (1. - opacity);

  ${th}

  fragColor = vec4(color, opacity);
}
`,oh=`#version 300 es
precision mediump float;

layout(location = 0) in vec4 a_position;

uniform vec2 u_resolution;
uniform float u_pixelRatio;
uniform float u_imageAspectRatio;
uniform float u_originX;
uniform float u_originY;
uniform float u_worldWidth;
uniform float u_worldHeight;
uniform float u_fit;
uniform float u_scale;
uniform float u_rotation;
uniform float u_offsetX;
uniform float u_offsetY;

out vec2 v_objectUV;
out vec2 v_objectBoxSize;
out vec2 v_responsiveUV;
out vec2 v_responsiveBoxGivenSize;
out vec2 v_patternUV;
out vec2 v_patternBoxSize;
out vec2 v_imageUV;

vec3 getBoxSize(float boxRatio, vec2 givenBoxSize) {
  vec2 box = vec2(0.);
  // fit = none
  box.x = boxRatio * min(givenBoxSize.x / boxRatio, givenBoxSize.y);
  float noFitBoxWidth = box.x;
  if (u_fit == 1.) { // fit = contain
    box.x = boxRatio * min(u_resolution.x / boxRatio, u_resolution.y);
  } else if (u_fit == 2.) { // fit = cover
    box.x = boxRatio * max(u_resolution.x / boxRatio, u_resolution.y);
  }
  box.y = box.x / boxRatio;
  return vec3(box, noFitBoxWidth);
}

void main() {
  gl_Position = a_position;

  vec2 uv = gl_Position.xy * .5;
  vec2 boxOrigin = vec2(.5 - u_originX, u_originY - .5);
  vec2 givenBoxSize = vec2(u_worldWidth, u_worldHeight);
  givenBoxSize = max(givenBoxSize, vec2(1.)) * u_pixelRatio;
  float r = u_rotation * 3.14159265358979323846 / 180.;
  mat2 graphicRotation = mat2(cos(r), sin(r), -sin(r), cos(r));
  vec2 graphicOffset = vec2(-u_offsetX, u_offsetY);


  // ===================================================

  float fixedRatio = 1.;
  vec2 fixedRatioBoxGivenSize = vec2(
  (u_worldWidth == 0.) ? u_resolution.x : givenBoxSize.x,
  (u_worldHeight == 0.) ? u_resolution.y : givenBoxSize.y
  );

  v_objectBoxSize = getBoxSize(fixedRatio, fixedRatioBoxGivenSize).xy;
  vec2 objectWorldScale = u_resolution.xy / v_objectBoxSize;

  v_objectUV = uv;
  v_objectUV *= objectWorldScale;
  v_objectUV += boxOrigin * (objectWorldScale - 1.);
  v_objectUV += graphicOffset;
  v_objectUV /= u_scale;
  v_objectUV = graphicRotation * v_objectUV;

  // ===================================================

  v_responsiveBoxGivenSize = vec2(
  (u_worldWidth == 0.) ? u_resolution.x : givenBoxSize.x,
  (u_worldHeight == 0.) ? u_resolution.y : givenBoxSize.y
  );
  float responsiveRatio = v_responsiveBoxGivenSize.x / v_responsiveBoxGivenSize.y;
  vec2 responsiveBoxSize = getBoxSize(responsiveRatio, v_responsiveBoxGivenSize).xy;
  vec2 responsiveBoxScale = u_resolution.xy / responsiveBoxSize;

  v_responsiveUV = uv;
  v_responsiveUV *= responsiveBoxScale;
  v_responsiveUV += boxOrigin * (responsiveBoxScale - 1.);
  v_responsiveUV += graphicOffset;
  v_responsiveUV /= u_scale;
  v_responsiveUV.x *= responsiveRatio;
  v_responsiveUV = graphicRotation * v_responsiveUV;
  v_responsiveUV.x /= responsiveRatio;

  // ===================================================

  float patternBoxRatio = givenBoxSize.x / givenBoxSize.y;
  vec2 patternBoxGivenSize = vec2(
  (u_worldWidth == 0.) ? u_resolution.x : givenBoxSize.x,
  (u_worldHeight == 0.) ? u_resolution.y : givenBoxSize.y
  );
  patternBoxRatio = patternBoxGivenSize.x / patternBoxGivenSize.y;

  vec3 boxSizeData = getBoxSize(patternBoxRatio, patternBoxGivenSize);
  v_patternBoxSize = boxSizeData.xy;
  float patternBoxNoFitBoxWidth = boxSizeData.z;
  vec2 patternBoxScale = u_resolution.xy / v_patternBoxSize;

  v_patternUV = uv;
  v_patternUV += graphicOffset / patternBoxScale;
  v_patternUV += boxOrigin;
  v_patternUV -= boxOrigin / patternBoxScale;
  v_patternUV *= u_resolution.xy;
  v_patternUV /= u_pixelRatio;
  if (u_fit > 0.) {
    v_patternUV *= (patternBoxNoFitBoxWidth / v_patternBoxSize.x);
  }
  v_patternUV /= u_scale;
  v_patternUV = graphicRotation * v_patternUV;
  v_patternUV += boxOrigin / patternBoxScale;
  v_patternUV -= boxOrigin;
  // x100 is a default multiplier between vertex and fragmant shaders
  // we use it to avoid UV presision issues
  v_patternUV *= .01;

  // ===================================================

  vec2 imageBoxSize;
  if (u_fit == 1.) { // contain
    imageBoxSize.x = min(u_resolution.x / u_imageAspectRatio, u_resolution.y) * u_imageAspectRatio;
  } else if (u_fit == 2.) { // cover
    imageBoxSize.x = max(u_resolution.x / u_imageAspectRatio, u_resolution.y) * u_imageAspectRatio;
  } else {
    imageBoxSize.x = min(10.0, 10.0 / u_imageAspectRatio * u_imageAspectRatio);
  }
  imageBoxSize.y = imageBoxSize.x / u_imageAspectRatio;
  vec2 imageBoxScale = u_resolution.xy / imageBoxSize;

  v_imageUV = uv;
  v_imageUV *= imageBoxScale;
  v_imageUV += boxOrigin * (imageBoxScale - 1.);
  v_imageUV += graphicOffset;
  v_imageUV /= u_scale;
  v_imageUV.x *= u_imageAspectRatio;
  v_imageUV = graphicRotation * v_imageUV;
  v_imageUV.x /= u_imageAspectRatio;

  v_imageUV += .5;
  v_imageUV.y = 1. - v_imageUV.y;
}`,sh=ih;function Ip(e,n,r){let l=e.createShader(n);if(!l)throw Error("metal-fx: gl.createShader returned null");if(e.shaderSource(l,r),e.compileShader(l),!e.getShaderParameter(l,e.COMPILE_STATUS)){let t=e.getShaderInfoLog(l);throw e.deleteShader(l),Error(`metal-fx: shader compile failed: ${t??"(no info log)"}`)}return l}function ch(e,n,r){let l=e.createProgram();if(!l)throw Error("metal-fx: gl.createProgram returned null");if(e.attachShader(l,n),e.attachShader(l,r),e.linkProgram(l),!e.getProgramParameter(l,e.LINK_STATUS)){let t=e.getProgramInfoLog(l);throw e.deleteProgram(l),Error(`metal-fx: program link failed: ${t??"(no info log)"}`)}return l}var S0=140,E0=40,C0=1.6,N0=1.3,C=null,Pl=null;function ah(){var e;if(Pl!==null)return Pl;if(typeof document>"u")return Pl=!1;try{let n=document.createElement("canvas").getContext("webgl2");Pl=!!n,(e=n==null?void 0:n.getExtension("WEBGL_lose_context"))==null||e.loseContext()}catch{Pl=!1}return Pl}var Sc=null;function fh(e){Sc=e}var dh=["u_resolution","u_time","u_pixelRatio","u_colorBack","u_colorTint","u_repetition","u_softness","u_shiftRed","u_shiftBlue","u_distortion","u_contour","u_angle","u_shape","u_isImage","u_image","u_originX","u_originY","u_worldWidth","u_worldHeight","u_fit","u_scale","u_rotation","u_offsetX","u_offsetY","u_imageAspectRatio"];function Rp(e){e.enable(e.BLEND),e.blendFunc(e.ONE,e.ONE_MINUS_SRC_ALPHA);let n=Ip(e,e.VERTEX_SHADER,oh),r=Ip(e,e.FRAGMENT_SHADER,sh),l=ch(e,n,r);e.useProgram(l);let t=e.createBuffer();if(!t)throw Error("metal-fx: gl.createBuffer returned null");e.bindBuffer(e.ARRAY_BUFFER,t),e.bufferData(e.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),e.STATIC_DRAW);let u=e.getAttribLocation(l,"a_position");e.enableVertexAttribArray(u),e.vertexAttribPointer(u,2,e.FLOAT,!1,0,0);let i={};for(let s of dh)i[s]=e.getUniformLocation(l,s);let o=e.createTexture();return o&&(e.activeTexture(e.TEXTURE0),e.bindTexture(e.TEXTURE_2D,o),e.texImage2D(e.TEXTURE_2D,0,e.RGBA,1,1,0,e.RGBA,e.UNSIGNED_BYTE,new Uint8Array([0,0,0,255])),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MIN_FILTER,e.LINEAR),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_MAG_FILTER,e.LINEAR),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_S,e.CLAMP_TO_EDGE),e.texParameteri(e.TEXTURE_2D,e.TEXTURE_WRAP_T,e.CLAMP_TO_EDGE),i.u_image&&e.uniform1i(i.u_image,0)),{program:l,buffer:t,uniforms:i,dummyTexture:o}}function P0(){if(C)return C;let e=Math.min(Jv,typeof window<"u"&&window.devicePixelRatio||1),n=Math.round(Gv*e),r=typeof OffscreenCanvas<"u",l,t;if(r)l=new OffscreenCanvas(n,n),t=l.getContext("webgl2",{alpha:!0,premultipliedAlpha:!0,antialias:!1});else{let a=document.createElement("canvas");a.width=n,a.height=n,t=a.getContext("webgl2",{alpha:!0,premultipliedAlpha:!0,antialias:!1,preserveDrawingBuffer:!0}),l=a}if(!t)throw Error("metal-fx: WebGL2 not supported");let{program:u,buffer:i,uniforms:o,dummyTexture:s}=Rp(t),c=(a)=>{a.preventDefault(),C?.gl===t&&(C.contextLost=!0)},d=()=>{if(!C||C.gl!==t)return;let a=Rp(C.gl);C.program=a.program,C.buffer=a.buffer,C.uniforms=a.uniforms,C.dummyTexture=a.dummyTexture,C.presetDirty=!0,C.contextLost=!1,Sc==null||Sc()};return l.addEventListener("webglcontextlost",c,!1),l.addEventListener("webglcontextrestored",d,!1),C={glCanvas:l,gl:t,program:u,buffer:i,uniforms:o,dummyTexture:s,preset:k0.chromatic.modes.dark,presetDirty:!0,contextLost:!1,useOffscreen:r,frameBitmap:null,startMs:performance.now(),pausedMs:0,pausedAtMs:null,rafId:0,dpr:e,instances:new Set,frameCount:0,glowQueue:[],glowIdx:0,glowSkip:0,glowPixels:new Uint8Array(n*n*4),glowPixelsW:n,glowPixelsH:n},C}function ph(){var e;if(!C)return;let{gl:n,program:r,buffer:l,frameBitmap:t,dummyTexture:u}=C;try{t==null||t.close(),n.deleteBuffer(l),n.deleteProgram(r),u&&n.deleteTexture(u),(e=n.getExtension("WEBGL_lose_context"))==null||e.loseContext()}catch{}C=null}var Fp=0;function mh(){if(!C)return;let e=performance.now();if(e-Fp<Yv)return;Fp=e;let{gl:n,glCanvas:r}=C,l=r.width,t=r.height;(C.glowPixelsW!==l||C.glowPixelsH!==t)&&(C.glowPixelsW=l,C.glowPixelsH=t,C.glowPixels=new Uint8Array(l*t*4)),n.readPixels(0,0,l,t,n.RGBA,n.UNSIGNED_BYTE,C.glowPixels)}var _l={bx:0,by:0};function Mi(e,n,r){if(!C)return _l.bx=0,_l.by=0,_l;let{glCanvas:l}=C,t=l.width,u=l.height,i=e.dpr,o=e.cssWidth*i,s=e.cssHeight*i,c=S0*i,d=E0*i,a=o*(t/c)/e.shaderScale,v=s*(u/d)/e.shaderScale;a>t&&(a=t),v>u&&(v=u);let h=(t-a)/2,g=(u-v)/2,y=h+n/e.cssWidth*a,S=g+r/e.cssHeight*v;return _l.bx=Math.round(y),_l.by=Math.round(u-1-S),_l}var En={r:0,g:0,b:0,lum:0,count:0};function _0(e,n,r,l,t,u){let i=Math.max(1,u|0),o=Math.max(0,l-i),s=Math.min(n,l+i+1),c=Math.max(0,t-i),d=Math.min(r,t+i+1);En.r=0,En.g=0,En.b=0,En.lum=0,En.count=0;for(let a=c;a<d;a++){let v=a*n;for(let h=o;h<s;h++){let g=(v+h)*4;En.r+=e[g],En.g+=e[g+1],En.b+=e[g+2],En.lum+=(0.2126*e[g]+0.7152*e[g+1]+0.0722*e[g+2])/255,En.count++}}return En}var we={r:255,g:255,b:255};function Ec(e,n,r,l){if(!C)return 0;let t=Mi(e,n,r),u=_0(C.glowPixels,C.glowPixelsW,C.glowPixelsH,t.bx,t.by,l);return u.count>0?u.lum/u.count:0}function z0(e,n,r,l){if(!C)return we.r=255,we.g=255,we.b=255,we;let t=Mi(e,n,r),u=_0(C.glowPixels,C.glowPixelsW,C.glowPixelsH,t.bx,t.by,l);return u.count===0?(we.r=255,we.g=255,we.b=255,we):(we.r=u.r/u.count,we.g=u.g/u.count,we.b=u.b/u.count,we)}function vh(e,n,r,l){if(!C)return we.r=255,we.g=255,we.b=255,we;let t=Mi(e,n,r),{glowPixels:u,glowPixelsW:i,glowPixelsH:o}=C,s=Math.max(1,l|0),c=Math.max(0,t.bx-s),d=Math.min(i,t.bx+s+1),a=Math.max(0,t.by-s),v=Math.min(o,t.by+s+1),h=-1;we.r=255,we.g=255,we.b=255;for(let g=a;g<v;g++){let y=g*i;for(let S=c;S<d;S++){let m=(y+S)*4,f=u[m],p=u[m+1],w=u[m+2],k=Math.max(f,p,w),E=Math.min(f,p,w),P=(k>0?(k-E)/k:0)*(0.35+0.65*(k/255));P>h&&(h=P,we.r=f,we.g=p,we.b=w)}}return we}var Cn={r:255,g:255,b:255,lum:0};function hh(e,n,r,l){if(Cn.r=255,Cn.g=255,Cn.b=255,Cn.lum=0,!C)return Cn;let t=Mi(e,n,r),{glowPixels:u,glowPixelsW:i,glowPixelsH:o}=C,s=Math.max(1,l|0),c=Math.max(0,t.bx-s),d=Math.min(i,t.bx+s+1),a=Math.max(0,t.by-s),v=Math.min(o,t.by+s+1);for(let h=a;h<v;h++){let g=h*i;for(let y=c;y<d;y++){let S=(g+y)*4,m=(0.2126*u[S]+0.7152*u[S+1]+0.0722*u[S+2])/255;m>Cn.lum&&(Cn.lum=m,Cn.r=u[S],Cn.g=u[S+1],Cn.b=u[S+2])}}return Cn}var ac=14,Op=1.5,fc={x:0,y:0};function Ml(e=512){return{xy:new Float32Array(e*2),n:0}}function Ul(e,n,r,l,t,u,i=Ml()){t=Math.max(0,Math.min(t,Math.min(r,l)/2));let o=4*(ac+1)+Math.ceil(2*(r+l)/Op)+8;i.xy.length<o*2&&(i.xy=new Float32Array(o*2));let s=i.xy,c=0,d=(h,g)=>{u?(u(h,g,fc),s[c*2]=fc.x,s[c*2+1]=fc.y):(s[c*2]=h,s[c*2+1]=g),c++},a=(h,g,y,S)=>{let m=Math.hypot(y-h,S-g),f=Math.max(1,Math.ceil(m/Op));for(let p=0;p<f;p++){let w=p/f;d(h+(y-h)*w,g+(S-g)*w)}},v=(h,g,y,S)=>{for(let m=0;m<=ac;m++){let f=y+(S-y)*(m/ac);d(h+t*Math.cos(f),g+t*Math.sin(f))}};return a(e+t,n,e+r-t,n),v(e+r-t,n+t,-Math.PI/2,0),a(e+r,n+t,e+r,n+l-t),v(e+r-t,n+l-t,0,Math.PI/2),a(e+r-t,n+l,e+t,n+l),v(e+t,n+l-t,Math.PI/2,Math.PI),a(e,n+l-t,e,n+t),v(e+t,n+t,Math.PI,1.5*Math.PI),i.n=c,i}fh(()=>{C&&C.instances.size>0&&C.pausedAtMs===null&&Vl()});typeof document<"u"&&document.addEventListener("visibilitychange",()=>{!C||C.pausedAtMs!==null||C.contextLost||(document.hidden?Vc():C.instances.size>0&&Vl())});function yh(e){let n=P0(),r=e.hostCanvas.getContext("2d",{alpha:!0});if(!r)throw Error("metal-fx: canvas 2D context unavailable");let l=e.scale??1,t={canvas:e.hostCanvas,ctx:r,cssWidth:e.cssWidth,cssHeight:e.cssHeight,cornerRadius:e.cornerRadius,kind:e.kind,ringCssPx:e.ringCssPx??(e.kind==="circle"?2:1)*l,shaderScale:e.shaderScale??(e.kind==="circle"?N0:C0)*l,opacityMul:e.opacityMul??1,glowGain:e.glowGain??1,visible:!0,paused:e.paused??!1,everCopied:!1,frozen:null,dpr:typeof window<"u"&&window.devicePixelRatio||1,scale:l,onAfterFrame:e.onAfterFrame,onComposite:e.onComposite,onFirstCopy:e.onFirstCopy,mask:e.mask??null,deform:null,deformLayers:null,overscan:0,cursorLight:null,glowFast:!1,rawCanvas:null,wantRaw:!1,ringCanvas:null,wantRing:!1};return jc(t),n.instances.add(t),n.rafId===0&&n.pausedAtMs===null&&Vl(),t}function gh(e){if(!C)return;C.instances.delete(e);let n=C.glowQueue.indexOf(e);n!==-1&&C.glowQueue.splice(n,1),C.instances.size===0&&(Vc(),ph())}function wh(e){C&&(C.glowQueue.includes(e)||C.glowQueue.push(e))}function kh(e){if(!C)return;let n=C.glowQueue.indexOf(e);n!==-1&&C.glowQueue.splice(n,1)}function zl(e,n){let r=!1;n.mask!==void 0&&(e.mask=n.mask),n.cssWidth!==void 0&&n.cssWidth!==e.cssWidth&&(e.cssWidth=n.cssWidth,r=!0),n.cssHeight!==void 0&&n.cssHeight!==e.cssHeight&&(e.cssHeight=n.cssHeight,r=!0),n.cornerRadius!==void 0&&(e.cornerRadius=n.cornerRadius),n.scale!==void 0&&(e.scale=n.scale),n.kind!==void 0&&n.kind!==e.kind&&(e.kind=n.kind,n.shaderScale===void 0&&(e.shaderScale=(n.kind==="circle"?N0:C0)*e.scale),n.ringCssPx===void 0&&(e.ringCssPx=(n.kind==="circle"?2:1)*e.scale)),n.shaderScale!==void 0&&(e.shaderScale=n.shaderScale),n.ringCssPx!==void 0&&(e.ringCssPx=n.ringCssPx),n.opacityMul!==void 0&&(e.opacityMul=n.opacityMul),n.glowGain!==void 0&&(e.glowGain=n.glowGain),n.paused!==void 0&&n.paused!==e.paused&&(e.paused=n.paused,n.paused?x0(e):e.frozen=null,!n.paused&&C&&C.rafId===0&&C.pausedAtMs===null&&!C.contextLost&&Vl()),r&&jc(e)}function Sh(e,n){e.visible=n,n&&C&&C.rafId===0&&C.pausedAtMs===null&&!C.contextLost&&Vl()}function Eh(e){return(typeof window<"u"&&window.devicePixelRatio||1)===e.dpr?!1:(jc(e),T0(e),!0)}var Ch=null;function Nh(e,n){let r=P0();r.preset=Ch??k0[e].modes[n],r.presetDirty=!0}function Uc(){!C||C.pausedAtMs!==null||(C.pausedAtMs=performance.now(),Vc())}function L0(){!C||C.pausedAtMs===null||(C.pausedMs+=performance.now()-C.pausedAtMs,C.pausedAtMs=null,C.instances.size>0&&Vl())}var Br=null;function Ph(e){Br=e}function dc(e,n){!Br||!C||!e.visible||e.paused||C.glowQueue.includes(e)&&(e.glowFast=!!Br(e,n))}function jc(e){e.dpr=typeof window<"u"&&window.devicePixelRatio||1;let n=e.overscan,r=Math.max(1,Math.round((e.cssWidth+2*n)*e.dpr)),l=Math.max(1,Math.round((e.cssHeight+2*n)*e.dpr));e.canvas.width!==r&&(e.canvas.width=r),e.canvas.height!==l&&(e.canvas.height=l);let t=e.canvas.style;n>0?(t.left=`${-n}px`,t.top=`${-n}px`,t.width=`calc(100% + ${2*n}px)`,t.height=`calc(100% + ${2*n}px)`,t.borderRadius="0"):t.left!==""&&(t.left="",t.top="",t.width="100%",t.height="100%",t.borderRadius="")}function _h(e){let{ctx:n,dpr:r,canvas:l}=e,t=e.ringCssPx*r,u=l.width,i=l.height,o=Math.max(0,(e.cornerRadius-e.ringCssPx)*r);n.save(),n.globalCompositeOperation="destination-out",n.fillStyle="#000",n.beginPath(),n.roundRect(t,t,u-2*t,i-2*t,o),n.fill(),n.restore()}var zh=Ml();function Vr(e,n,r,l,t,u,i,o){let{xy:s,n:c}=Ul(n,r,l,t,u,i,zh);e.beginPath();for(let d=0;d<c;d++)d===0?e.moveTo(s[0]*o,s[1]*o):e.lineTo(s[d*2]*o,s[d*2+1]*o);e.closePath()}function x0(e){if(!C)return null;let n=C.frameBitmap??C.glCanvas,r=C.glCanvas.width,l=C.glCanvas.height;if(r<1||l<1)return null;let t=e.frozen;t||(t=document.createElement("canvas"),e.frozen=t),(t.width!==r||t.height!==l)&&(t.width=r,t.height=l);let u=t.getContext("2d");return u?(u.clearRect(0,0,r,l),u.drawImage(n,0,0),t):(e.frozen=null,null)}function T0(e){var n,r;if(!C)return;let l=(e.paused?e.frozen??x0(e):null)??C.frameBitmap??C.glCanvas,t=e.dpr,u=e.canvas.width,i=e.canvas.height;if(u<1||i<1)return;let o=Math.max(1,Math.round(e.cssWidth*t)),s=Math.max(1,Math.round(e.cssHeight*t)),c=e.overscan*t,d=l.width,a=l.height,v=S0*t,h=E0*t,g=o*(d/v)/e.shaderScale,y=s*(a/h)/e.shaderScale;g>d&&(g=d),y>a&&(y=a);let S=Math.max(0,(d-g)/2),m=Math.max(0,(a-y)/2),f=e.opacityMul*C.preset.shaderOpacity,p=e.ctx;p.clearRect(0,0,u,i);let w=e.deform;if(e.mask){if(f<1&&(p.globalAlpha=f),p.drawImage(l,S,m,g,y,0,0,u,i),f<1&&(p.globalAlpha=1),e.wantRaw){let k=e.rawCanvas;k||(k=document.createElement("canvas"),e.rawCanvas=k),(k.width!==u||k.height!==i)&&(k.width=u,k.height=i);let E=k.getContext("2d");E&&(E.clearRect(0,0,u,i),E.drawImage(e.canvas,0,0))}p.save(),p.globalCompositeOperation="destination-in",p.fillStyle="#000",e.mask(p,u,i,t),p.restore(),p.globalCompositeOperation="source-over"}else if(!w)f<1&&(p.globalAlpha=f),p.drawImage(l,S,m,g,y,0,0,u,i),f<1&&(p.globalAlpha=1),_h(e);else{let{cssWidth:k,cssHeight:E,cornerRadius:P,ringCssPx:N,deformLayers:x}=e;p.save(),p.translate(c,c);let L=o/g,T=s/y,V=Math.min(d,g*(o+2*c)/o),I=Math.min(a,y*(s+2*c)/s),B=Math.max(0,(d-V)/2),q=Math.max(0,(a-I)/2),Y=V*L,R=I*T;if(f<1&&(p.globalAlpha=f),p.drawImage(l,B,q,V,I,o/2-Y/2,s/2-R/2,Y,R),f<1&&(p.globalAlpha=1),p.globalCompositeOperation="destination-in",Vr(p,0,0,k,E,P,w,t),p.fillStyle="#000",p.fill(),p.globalCompositeOperation="destination-out",Vr(p,N,N,k-2*N,E-2*N,Math.max(0,P-N),w,t),p.fill(),e.wantRing){let z=e.ringCanvas;z||(z=document.createElement("canvas"),e.ringCanvas=z),(z.width!==u||z.height!==i)&&(z.width=u,z.height=i);let F=z.getContext("2d");F&&(F.setTransform(1,0,0,1,0,0),F.globalCompositeOperation="source-over",F.clearRect(0,0,u,i),F.translate(c,c),f<1&&(F.globalAlpha=f),F.drawImage(l,B,q,V,I,o/2-Y/2,s/2-R/2,Y,R),F.globalAlpha=1,F.globalCompositeOperation="destination-out",Vr(F,N,N,k-2*N,E-2*N,Math.max(0,P-N),w,t),F.fillStyle="#000",F.fill(),F.globalCompositeOperation="source-over",F.setTransform(1,0,0,1,0,0))}if(x!=null&&x.hairline){let z=x.hairline;p.globalCompositeOperation="destination-over",Vr(p,z.inset,z.inset,k-2*z.inset,E-2*z.inset,Math.max(0,P-z.inset),w,t),p.lineWidth=z.width*t,p.strokeStyle=z.color,p.stroke()}if(x!=null&&x.fill&&(p.globalCompositeOperation="destination-over",Vr(p,0,0,k,E,P,w,t),p.fillStyle=x.fill,p.fill()),x!=null&&x.rim){let z=x.rim;p.globalCompositeOperation="source-over",p.save(),Vr(p,0,0,k,E,P,w,t),p.clip();let F=z.inset+z.width/2;Vr(p,F,F,k-2*F,E-2*F,Math.max(0,P-F),w,t),p.lineWidth=z.width*t,p.strokeStyle=z.color,p.stroke(),p.restore()}p.restore(),p.globalCompositeOperation="source-over"}if((n=e.onComposite)==null||n.call(e),e.onFirstCopy){let k=e.onFirstCopy;e.onFirstCopy=void 0,k()}(r=e.onAfterFrame)==null||r.call(e)}function Lh(){if(!C)return;let{gl:e,uniforms:n,preset:r,glCanvas:l,dpr:t}=C;n.u_resolution&&e.uniform2f(n.u_resolution,l.width,l.height),n.u_pixelRatio&&e.uniform1f(n.u_pixelRatio,t),n.u_colorBack&&e.uniform4fv(n.u_colorBack,Tp(r.colorBack)),n.u_colorTint&&e.uniform4fv(n.u_colorTint,Tp(r.colorTint)),n.u_repetition&&e.uniform1f(n.u_repetition,r.repetition),n.u_softness&&e.uniform1f(n.u_softness,r.softness),n.u_shiftRed&&e.uniform1f(n.u_shiftRed,r.shiftRed),n.u_shiftBlue&&e.uniform1f(n.u_shiftBlue,r.shiftBlue),n.u_distortion&&e.uniform1f(n.u_distortion,r.distortion),n.u_contour&&e.uniform1f(n.u_contour,r.contour),n.u_angle&&e.uniform1f(n.u_angle,r.angle),n.u_shape&&e.uniform1f(n.u_shape,r.shape),n.u_isImage&&e.uniform1i(n.u_isImage,0),n.u_imageAspectRatio&&e.uniform1f(n.u_imageAspectRatio,1),n.u_originX&&e.uniform1f(n.u_originX,r.originX),n.u_originY&&e.uniform1f(n.u_originY,r.originY),n.u_worldWidth&&e.uniform1f(n.u_worldWidth,r.worldWidth),n.u_worldHeight&&e.uniform1f(n.u_worldHeight,r.worldHeight),n.u_fit&&e.uniform1f(n.u_fit,r.fit),n.u_scale&&e.uniform1f(n.u_scale,r.scale),n.u_rotation&&e.uniform1f(n.u_rotation,r.rotation),n.u_offsetX&&e.uniform1f(n.u_offsetX,r.offsetX),n.u_offsetY&&e.uniform1f(n.u_offsetY,r.offsetY),C.presetDirty=!1}function xh(e){if(!C)return;let{gl:n,uniforms:r,preset:l,glCanvas:t}=C,u=(e-C.startMs-C.pausedMs)/1000*l.speed;n.viewport(0,0,t.width,t.height),n.clearColor(0,0,0,0),n.clear(n.COLOR_BUFFER_BIT),C.presetDirty&&Lh(),r.u_time&&n.uniform1f(r.u_time,u),n.drawArrays(n.TRIANGLES,0,6),C.frameCount++}var Mp=0;function D0(e){var n;if(!C)return;if(C.contextLost){C.rafId=0;return}let r=!1;for(let l of C.instances)if(l.visible&&(!l.paused||!l.everCopied)){r=!0;break}if(!r){C.rafId=0;return}if(C.rafId=requestAnimationFrame(D0),e-Mp<Av){if(Br)for(let l of C.glowQueue)l.glowFast&&l.visible&&!l.paused&&(l.glowFast=!!Br(l,e));return}Mp=e,xh(e),mh(),C.useOffscreen&&((n=C.frameBitmap)==null||n.close(),C.frameBitmap=C.glCanvas.transferToImageBitmap());for(let l of C.instances)l.visible&&(l.paused&&l.everCopied||(T0(l),l.everCopied=!0));if(Br&&C.glowQueue.length>0&&++C.glowSkip%Zv===0)for(let l of C.glowQueue)l.visible&&!l.paused&&(l.glowFast=!!Br(l,e))}function Vl(){!C||C.rafId!==0||(C.rafId=requestAnimationFrame(D0))}function Vc(){C&&(C.rafId!==0&&cancelAnimationFrame(C.rafId),C.rafId=0)}var Cc={linear:(e)=>e,smoothstep:(e)=>e*e*(3-2*e)};function Ut(e,n,r,l=Cc.linear){return{from:e,to:n,dur:r,ease:l,startMs:-1,val:e,done:!1}}function jt(e,n){e.startMs=n,e.val=e.from,e.done=!1}function Up(e,n){if(e.done||e.startMs<0)return e.val;let r=Math.min(1,(n-e.startMs)/e.dur);return e.val=e.from+(e.to-e.from)*e.ease(r),r>=1&&(e.done=!0),e.val}var Th=Object.freeze({haloOpMul:2,extraIntensity:3.51,peakOp:0.85,baseOp:0.34,inset:1.5,extraOutward:1,wanderRange:15,wanderLerp:0.0075,fadeRate:0.00875,lumLo:0.08,lumHi:0.32,minDwellMs:1500,relocFadeMs:300,relocFadeOutMs:450,pointGain:2.5,haloHalfLen:7.8,extraHalfLen:3.0465066666666663,haloStrokeXl:26.4,haloStrokeLg:15.6,haloStrokeMd:7.2,haloStrokeSm:3,haloBlurXl:8.4,haloBlurLg:4.8,haloBlurMd:2.1,haloBlurSm:0.9,haloOpXl:0.385,haloOpLg:0.595,haloOpMd:0.7,haloOpSm:0.7,extraStrokeOuter:1.3333333333333333,extraStrokeCore:0.6666666666666666,extraBlurOuter:0.6666666666666666,extraBlurCore:0.45,extraFadeR:4.333333333333333,extraOpOuter:0.85}),O={...Th},jp=new Set;function Dh(e){return jp.add(e),()=>{jp.delete(e)}}var Ih=Object.freeze({enabled:!0,reach:56,fadeMs:200,cursor:!0,cursorDistance:186,cursorStrength:3.35,cursorDiffuse:1.4,cursorFalloff:37,cursorDepth:0.4,cursorEdge:0,cursorReach:11.5,cursorBlur:0.5,cursorZoom:3,spill:!1,spillRadius:48,spillStrength:0.55,spillOffset:0.35,spillLumGain:0.7,spillSaturation:1.3,spillInside:0.5,spillBlur:0,catchLight:!1,catchFollow:0.25,catchGain:1}),Qt={...Ih};var Fl=null,Di=null,Vp=0;function Rh(){let e=window.devicePixelRatio||1;return Vp>0?Vp/e:1}function I0(e,n){if(!pn||!Fl)return;let r=Rh(),l=(e-Fl.hotX*r).toFixed(2),t=(n-Fl.hotY*r).toFixed(2);pn.style.transform=r===1?`translate3d(${l}px,${t}px,0)`:`translate3d(${l}px,${t}px,0) scale(${r.toFixed(4)})`}var R0=!1,F0=0,Pi=0,_i=null,zi={x:0,y:0},Li=null,Qp=0;function Fh(e,n,r,l,t){if(Li&&Qp===r&&Li.length===l*t)return Li;let u=document.createElement("canvas");u.width=l,u.height=t;let i=u.getContext("2d",{willReadFrequently:!0});if(!i)return null;i.scale(r,r),i.drawImage(e,0,0,n.width,n.height);let o=i.getImageData(0,0,l,t).data,s=new Uint8ClampedArray(l*t);for(let c=0,d=3;c<s.length;c++,d+=4)s[c]=o[d]>=128?255:0;return Li=s,Qp=r,s}function Hp(e,n,r,l){let t=e.getImageData(0,0,n,r),u=t.data;for(let i=0,o=0,s=3;i<r;i++)for(let c=0;c<n;c++,o++,s+=4){let d=u[s];if(d===0)continue;let a=l(c,i,o);u[s]=a>=1?d:a<=0?0:d*a}e.putImageData(t,0,0)}function Oh(e,n){if(!_i)return 0;let r=-1/0;for(let l=0;l<_i.length;l+=2){let t=_i[l]*e+_i[l+1]*n;t>r&&(r=t)}return r===-1/0?0:r}var Wt=0,jl=!1,Wr=0,Nc=0,Tn=Number.NaN,wr=Number.NaN,Kt=0,Yt=0,Qr=0,Hr=0,pe=null,G={d:0,nx:0,ny:0,k:1,left:0,top:0},pc={x:0,y:0},$n={r:255,g:255,b:255},Yn=null,Pc="",_c=-1,zc=-1,Zt=!1;function Mh(){Wt++,jh()}function Uh(){Wt=Math.max(0,Wt-1),Wt===0&&Vh()}var Ht=(e)=>typeof window.matchMedia=="function"&&window.matchMedia(e).matches;function Bp(){if(R0||performance.now()<F0||!Fl||!Di||Ht("(prefers-reduced-motion: reduce)")||Ht("(forced-colors: active)")||!Ht("(pointer: fine)")||!Ht("(hover: hover)"))return!1;let e=window.visualViewport;return!(e&&Math.abs(e.scale-1)>0.001)}function jh(){jl||Wt===0||typeof document>"u"||Ht("(pointer: fine)")&&(jl=!0,document.addEventListener("pointermove",O0,{passive:!0}),document.addEventListener("pointerleave",kr),document.addEventListener("pointercancel",kr),document.addEventListener("keydown",M0,{passive:!0}),document.addEventListener("visibilitychange",kr),window.addEventListener("blur",kr))}function Vh(){jl&&(jl=!1,document.removeEventListener("pointermove",O0),document.removeEventListener("pointerleave",kr),document.removeEventListener("pointercancel",kr),document.removeEventListener("keydown",M0),document.removeEventListener("visibilitychange",kr),window.removeEventListener("blur",kr),Wr!==0&&(cancelAnimationFrame(Wr),Wr=0),pe&&(pe.cursorLight=null,pe=null),Qr=0,Hr=0,Yn&&(Yn.remove(),Yn=null,Pc="",_c=-1,zc=-1,Zt=!1),Ar(),pn&&(pn.remove(),pn=null))}var Lc=!0,Qc=!1;function O0(e){Lc=e.pointerType==="mouse"||e.pointerType==="",Qc=!1,Tn=Kt=e.clientX,wr=Yt=e.clientY,Gt&&pn&&(Lc&&j0(Tn,wr)?I0(Tn,wr):Ar()),U0()}function M0(){Qc=!0,Ar()}function kr(){Tn=wr=Number.NaN,U0()}function U0(){!jl||Wr!==0||(Nc=performance.now(),Wr=requestAnimationFrame(V0))}function Qh(e,n,r,l,t,u,i){let o=u==="circle"?Math.min(r,l)/2:Math.max(0,Math.min(t,Math.min(r,l)/2)),s=r/2,c=l/2,d=Math.max(0,r/2-o),a=Math.max(0,l/2-o),v=Math.max(-d,Math.min(d,e-s)),h=Math.max(-a,Math.min(a,n-c)),g=e-s-v,y=n-c-h,S=Math.hypot(g,y);if(S>0.000001)return i.x=s+v+g/S*o,i.y=c+h+y/S*o,S-o;let m=e,f=r-e,p=n,w=l-n,k=Math.min(m,f,p,w);return k===m?(i.x=0,i.y=n):k===f?(i.x=r,i.y=n):k===p?(i.x=e,i.y=0):(i.x=e,i.y=l),-k}var pn=null,yr=null,xc=null,Ge=null,Bt=null,Wp=!1,$p=0,Ap=0,Kp=0,Gt=!1,Rl=!1,Tc="",Kn=null,$t="",Hh=/^(INPUT|TEXTAREA|SELECT)$/,Dc=new WeakMap,Yp=0,Ic=null;function Bh(e){let n=e;for(;n&&n!==document.body;){if(Hh.test(n.tagName)||n.isContentEditable)return!0;n=n.parentElement}return!1}function Wh(){if(pn)return!0;let e=document.createElement("div");e.className="metal-fx-cursor",e.setAttribute("aria-hidden","true"),e.style.cssText="position:fixed;left:0;top:0;pointer-events:none;z-index:2147483001;will-change:transform;transform-origin:0 0;display:none";let n=document.createElement("canvas");n.style.display="block",e.appendChild(n),document.body.appendChild(e);let r=n.getContext("2d"),l=document.createElement("canvas"),t=l.getContext("2d");return!r||!t?(e.remove(),!1):(pn=e,yr=n,xc=r,Ge=l,Bt=t,!0)}function j0(e,n,r=!1){let l=performance.now();if(!r&&Rl&&l-Yp<12)return!0;Yp=l;let t=document.elementFromPoint(e,n);if(!t)return Rc(),!1;if(t===Ic&&Rl)return!0;Ic=t;let u=Dc.get(t);if(u===void 0){if(u=!Bh(t),u){let i=getComputedStyle(t).cursor;u=i==="auto"||i==="default"||i==="none"}Dc.set(t,u)}if(!u)return Rc(),!1;if(!Rl){let i=document.documentElement;Tc=i.style.cursor,i.style.cursor="none",Rl=!0}return t!==Kn&&(Kn&&(Kn.style.cursor=$t,Kn=null,$t=""),getComputedStyle(t).cursor!=="none"&&(Kn=t,$t=t.style.cursor,t.style.cursor="none")),!0}function Rc(){Kn&&(Kn.isConnected&&(Kn.style.cursor=$t),Kn=null,$t=""),Rl&&(document.documentElement.style.cursor=Tc,Rl=!1,Tc=""),Ic=null,Dc=new WeakMap}function Ar(){Rc(),pn&&Gt&&(pn.style.display="none",Gt=!1)}function $h(e,n,r){if(!xc||!Bt||!yr||!Ge||!pn||!Fl||!Di)return;let l=Fl,t=Math.min(3,window.devicePixelRatio||1);if((t!==$p||l.width!==Ap||l.height!==Kp)&&($p=t,Ap=l.width,Kp=l.height,yr.width=Ge.width=Math.ceil(l.width*t),yr.height=Ge.height=Math.ceil(l.height*t),yr.style.width=`${l.width}px`,yr.style.height=`${l.height}px`),!Wp&&(Bt=Ge.getContext("2d",{willReadFrequently:!0}),Wp=!0,!Bt))return;let u=xc,i=Bt,o=l.width,s=l.height;u.setTransform(1,0,0,1,0,0),u.clearRect(0,0,yr.width,yr.height),u.scale(t,t),u.drawImage(Di,0,0,o,s);let c=G.left+G.nx*G.k,d=G.top+G.ny*G.k,a=Kt-l.hotX+zi.x,v=Yt-l.hotY+zi.y,h=c-a,g=d-v,y=Math.hypot(h,g),S=y>0.01?h/y:1,m=y>0.01?g/y:0,f=Oh(S,m)+n.cursorEdge,p=Math.max(0,y-f),w=Math.max(1,n.cursorFalloff),k=1/(1+p/w*(p/w)),E=e.cssWidth/2,P=e.cssHeight/2,N=E-G.nx,x=P-G.ny,L=Math.hypot(N,x)||1,T=e.mask?0:e.ringCssPx*0.5+1,V=G.nx+N/L*T,I=G.ny+x/L*T,B=hh(e,V,I,4),q=B.lum,Y=B.r,R=B.g,z=B.b,F=n.cursorStrength*k*r,ne=n.cursorDiffuse*k*(0.5+0.5*Math.min(1,q/0.5))*r;if(y>0.01&&F+ne>0.005){let re=h/y,ie=g/y,Q=Math.atan2(ie,re),j=Math.max(0.1,Math.min(1,n.cursorDepth)),$=zi.x+f*re,H=zi.y+f*ie,A=Math.max(1,n.cursorReach);if(i.setTransform(1,0,0,1,0,0),i.clearRect(0,0,Ge.width,Ge.height),i.scale(t,t),F>0.005){i.save(),i.filter=n.cursorBlur>0?`blur(${n.cursorBlur}px)`:"none";let ke=Math.max(1,n.cursorZoom);i.translate($,H),i.rotate(Q),i.scale(-1,1),i.translate((y-f)*j,0),i.rotate(-Q),i.scale(ke,ke);let Se=e.overscan,W=G.k,le=Math.max(1,Math.ceil(F));i.globalAlpha=Math.min(1,F/le),i.globalCompositeOperation="lighter";let Ce=e.mask&&e.rawCanvas?e.rawCanvas:e.canvas;for(let Z=0;Z<le;Z++)i.drawImage(Ce,-(G.nx+Se)*W,-(G.ny+Se)*W,(e.cssWidth+2*Se)*W,(e.cssHeight+2*Se)*W);i.restore();let ve=1/t,U=1/A;Hp(i,Ge.width,Ge.height,(Z,b)=>{let Le=-(((Z+0.5)*ve-$)*re+((b+0.5)*ve-H)*ie);return Le<=0?1:1-Le*U})}if(ne>0.005){let ke=Math.max(Y,R,z)||1,Se=Math.round(Y*255/ke),W=Math.round(R*255/ke),le=Math.round(z*255/ke),Ce=A*1.2,ve=i.createLinearGradient($+0.5*re,H+0.5*ie,$-Ce*re,H-Ce*ie),U=Math.min(1,ne);ve.addColorStop(0,`rgba(${Se},${W},${le},${U.toFixed(3)})`),ve.addColorStop(0.45,`rgba(${Se},${W},${le},${(U*0.4).toFixed(3)})`),ve.addColorStop(1,`rgba(${Se},${W},${le},0)`),i.globalCompositeOperation="lighter",i.fillStyle=ve,i.fillRect(0,0,o,s),i.globalCompositeOperation="source-over"}let me=Fh(Di,l,t,Ge.width,Ge.height);me&&Hp(i,Ge.width,Ge.height,(ke,Se,W)=>me[W]===0?0:1),u.globalCompositeOperation="lighter",u.drawImage(Ge,0,0,o,s),u.globalCompositeOperation="source-over"}I0(Kt,Yt),Gt||(pn.style.display="",Gt=!0)}function Ah(){if(Yn)return Yn;let e=document.createElement("div");return e.className="metal-fx-cursor-spill",e.setAttribute("aria-hidden","true"),e.style.cssText="position:fixed;left:0;top:0;pointer-events:none;z-index:2147483000;border-radius:50%;mix-blend-mode:plus-lighter;will-change:transform,opacity;opacity:0;display:none",document.body.appendChild(e),Yn=e,e}function Fc(){!Yn||!Zt||(Yn.style.display="none",Yn.style.opacity="0",Zt=!1)}function V0(e){if(Wr=0,!jl)return;let n=performance.now();try{Kh(e)}catch(r){R0=!0,Ar(),Fc(),pe&&(pe.cursorLight=null,pe=null),typeof console<"u"&&console.warn("metal-fx: cursor light disabled after error",r);return}performance.now()-n>6?++Pi>=20&&(Pi=0,F0=performance.now()+5000,Ar()):Pi>0&&Pi--}function Kh(e){let n=Qt,r=Math.min(0.05,Math.max(0.001,(e-Nc)/1000));Nc=e;let l=null,t=0,u=0;if(n.enabled&&C&&!Number.isNaN(Tn)){let o=Number.POSITIVE_INFINITY,s=Math.max(1,n.reach),c=n.cursor&&Bp()?Math.max(1,n.cursorDistance):0,d=Math.max(s,c);for(let a of C.instances){if(!a.visible||!a.canvas.isConnected)continue;let v=a.canvas.getBoundingClientRect();if(v.width<=0)continue;let h=a.overscan,g=v.width/(a.cssWidth+2*h),y=v.left+h*g,S=v.top+h*g,m=d*g;if(Tn<y-m||Tn>y+a.cssWidth*g+m||wr<S-m||wr>S+a.cssHeight*g+m)continue;let f=(Tn-y)/g,p=(wr-S)/g,w=Qh(f,p,a.cssWidth,a.cssHeight,a.cornerRadius,a.kind,pc),k=Math.abs(w);k<=d&&k<o&&(o=k,l=a,G.d=w,G.nx=pc.x,G.ny=pc.y,G.k=g,G.left=y,G.top=S)}if(l){if(o<=s){let a=1-o/s;t=a*a*(3-2*a)}o<=c&&(u=Math.min(1,(1-o/c)*3)),l.mask&&(G.nx=l.cssWidth/2,G.ny=l.cssHeight/2,l.wantRaw=!0)}}let i=1-Math.exp(-(r*1000)/(Math.max(1,n.fadeMs)/3));if(Qr+=(t-Qr)*i,Hr+=(u-Hr)*i,l&&l!==pe&&(pe&&(pe.cursorLight=null,dc(pe,e)),pe=l),!l&&Qr<0.002&&Hr<0.002){Qr=0,Hr=0,pe&&(pe.cursorLight=null,dc(pe,e),pe=null),Fc(),Ar();return}if(pe){if(n.catchLight){let o=pe.cursorLight??(pe.cursorLight={x:0,y:0,w:0});o.x=G.nx,o.y=G.ny,o.w=Qr}else pe.cursorLight&&(pe.cursorLight=null);if(dc(pe,e),n.cursor&&Hr>0.002&&Lc&&!Qc&&!Number.isNaN(Tn)&&Bp()&&Wh()&&j0(Tn,wr)?$h(pe,n,Hr):Ar(),n.spill){let o=Ah(),s=z0(pe,G.nx,G.ny,2),c=Ec(pe,G.nx,G.ny,3),d=Math.max(s.r,s.g,s.b)||1,a=g0(s.r*255/d,s.g*255/d,s.b*255/d),[v,h,g]=w0(a[0],Math.min(1,a[1]*n.spillSaturation),1);$n.r+=(v-$n.r)*0.15,$n.g+=(h-$n.g)*0.15,$n.b+=(g-$n.b)*0.15;let y=Math.round($n.r/6)*6,S=Math.round($n.g/6)*6,m=Math.round($n.b/6)*6,f=`radial-gradient(closest-side, rgba(${y},${S},${m},1) 0%, rgba(${y},${S},${m},0.35) 45%, rgba(${y},${S},${m},0) 100%)`;f!==Pc&&(Pc=f,o.style.background=f);let p=Math.max(1,n.spillRadius*G.k);p!==_c&&(_c=p,o.style.width=`${(2*p).toFixed(1)}px`,o.style.height=`${(2*p).toFixed(1)}px`),n.spillBlur!==zc&&(zc=n.spillBlur,o.style.filter=n.spillBlur>0?`blur(${n.spillBlur}px)`:"");let w=G.left+G.nx*G.k,k=G.top+G.ny*G.k,E=Kt+(w-Kt)*n.spillOffset,P=Yt+(k-Yt)*n.spillOffset;o.style.transform=`translate3d(${(E-p).toFixed(2)}px,${(P-p).toFixed(2)}px,0)`;let N=Math.min(1,Math.max(0,c/0.3)),x=1-n.spillLumGain+n.spillLumGain*N,L=G.d<0?n.spillInside:1,T=Math.max(0,Math.min(1,n.spillStrength*Qr*x*L));Zt||(o.style.display="",Zt=!0),o.style.opacity=T.toFixed(3)}else Fc();Wr=requestAnimationFrame(V0)}}var Ri=new Map;function Yh(e,n){let r=Math.sqrt(12*e*e/n+1),l=Math.floor(r);l%2===0&&l--;let t=l+2,u=(12*e*e-n*l*l-4*n*l-3*n)/(-4*l-4),i=Math.round(u),o=[];for(let s=0;s<n;s++)o.push(s<i?l:t);return o}function Zh(e,n,r,l,t){let u=1/(t+t+1);for(let i=0;i<l;i++){let o=i*r,s=0;for(let c=-t;c<=t;c++)s+=e[o+Math.min(r-1,Math.max(0,c))];for(let c=0;c<r;c++){n[o+c]=s*u;let d=o+Math.max(0,c-t),a=o+Math.min(r-1,c+t+1);s+=e[a]-e[d]}}}function Gh(e,n,r,l,t){let u=1/(t+t+1);for(let i=0;i<r;i++){let o=0;for(let s=-t;s<=t;s++)o+=e[Math.min(l-1,Math.max(0,s))*r+i];for(let s=0;s<l;s++){n[s*r+i]=o*u;let c=Math.max(0,s-t)*r+i,d=Math.min(l-1,s+t+1)*r+i;o+=e[d]-e[c]}}}function Hc(e,n,r,l){if(l<=0.05)return e;let t=new Float32Array(e.length),u=e;for(let i of Yh(l,3)){let o=(i-1)/2;Zh(u,t,n,r,o),Gh(t,u,n,r,o)}return u}function Jh(e,n,r,l,t,u,i){let o=document.createElement("canvas");o.width=r,o.height=l;let s=o.getContext("2d",{willReadFrequently:!0}),c=new Float32Array(r*l);if(!s)return c;s.scale(t,t),s.strokeStyle="#fff",s.lineCap="round",s.lineJoin="round",s.lineWidth=n,s.beginPath(),s.moveTo(u-e,i),s.lineTo(u+e,i),s.stroke();let d=s.getImageData(0,0,r,l).data;for(let a=0,v=3;a<c.length;a++,v+=4)c[a]=d[v]/255;return c}function Q0(e,n,r,l,t){let u=0;for(let y of e)u=Math.max(u,(y.stroke/2+3*y.blur)*r);let i=Math.ceil(u)+1,o=2*n+2*i,s=2*i,c=Math.ceil(o*l),d=Math.ceil(s*l),a=new Float32Array(c*d);for(let y of e){let S=Jh(n,y.stroke*r,c,d,l,i,i);S=Hc(S,c,d,y.blur*r*l);let m=y.opacity;for(let f=0;f<a.length;f++){let p=S[f]*m;a[f]=a[f]+p*(1-a[f])}}if(t>0){let y=i*l,S=i*l,m=t*r*l;for(let f=0;f<d;f++)for(let p=0;p<c;p++){let w=Math.hypot(p+0.5-y,f+0.5-S)/m,k;w<=0.3?k=1:w<=0.65?k=1-(w-0.3)/0.35*0.75:w<1?k=0.25*(1-(w-0.65)/0.35):k=0,a[f*c+p]*=k}}let v=document.createElement("canvas");v.width=c,v.height=d;let h=v.getContext("2d"),g=new Uint8ClampedArray(c*d);for(let y=0;y<a.length;y++)g[y]=Math.round(Math.min(1,a[y])*255);if(h){let y=h.createImageData(c,d),S=y.data;for(let m=0,f=0;m<a.length;m++,f+=4)S[f]=255,S[f+1]=255,S[f+2]=255,S[f+3]=g[m];h.putImageData(y,0,0)}return{canvas:v,alpha:g,w:o,h:s,ax:i,ay:i}}function H0(){return[O.haloStrokeXl,O.haloStrokeLg,O.haloStrokeMd,O.haloStrokeSm,O.haloBlurXl,O.haloBlurLg,O.haloBlurMd,O.haloBlurSm,O.haloOpXl,O.haloOpLg,O.haloOpMd,O.haloOpSm,O.extraStrokeOuter,O.extraStrokeCore,O.extraBlurOuter,O.extraBlurCore,O.extraFadeR,O.extraOpOuter].join(",")}function Xh(e,n,r){let l=`h|${e.toFixed(2)}|${n}|${r}|${H0()}`,t=Ri.get(l);return t||(t=Q0([{stroke:O.haloStrokeXl,blur:O.haloBlurXl,opacity:O.haloOpXl},{stroke:O.haloStrokeLg,blur:O.haloBlurLg,opacity:O.haloOpLg},{stroke:O.haloStrokeMd,blur:O.haloBlurMd,opacity:O.haloOpMd},{stroke:O.haloStrokeSm,blur:O.haloBlurSm,opacity:O.haloOpSm}],e,n,r,0),Ri.set(l,t)),t}function qh(e,n,r){let l=`e|${e.toFixed(2)}|${n}|${r}|${H0()}`,t=Ri.get(l);return t||(t=Q0([{stroke:O.extraStrokeOuter,blur:O.extraBlurOuter,opacity:O.extraOpOuter},{stroke:O.extraStrokeCore,blur:O.extraBlurCore,opacity:1}],e,n,r,O.extraFadeR),Ri.set(l,t)),t}function Zp(e,n,r,l,t){var u;let i=n<<16|r<<8|l;if(t.canvas&&t.tint===i&&t.src===e)return t.canvas;let{canvas:o,img:s}=t;(!o||!s||t.src!==e)&&(o=document.createElement("canvas"),o.width=e.canvas.width,o.height=e.canvas.height,s=((u=o.getContext("2d"))==null?void 0:u.createImageData(o.width,o.height))??null);let c=o.getContext("2d");if(c&&s){let d=s.data,a=e.alpha;for(let v=0,h=0;v<a.length;v++,h+=4)d[h]=n,d[h+1]=r,d[h+2]=l,d[h+3]=a[v];c.putImageData(s,0,0)}return t.canvas=o,t.img=s,t.tint=i,t.src=e,o}function Bc(e,n,r){let l=Math.max(0,Math.min(r,Math.min(e,n)/2));return 2*Math.max(0,e-2*l)+2*Math.max(0,n-2*l)+2*Math.PI*l}function Fi(e,n,r,l){return l==="circle"?2*Math.PI*Math.max(0,Math.min(r,Math.min(e,n)/2)):Bc(e,n,r)}function Jt(e,n,r,l,t,u,i,o){let s=o||{x:0,y:0},c=Math.max(0,Math.min(l,Math.min(n,r)/2));if(i==="circle"){let m=2*Math.PI*c;if(m<=0.0001)return s.x=n*0.5,s.y=r*0.5,s;e=(e%m+m)%m;let f=-Math.PI/2+e/m*Math.PI*2,p=Math.max(0,c-t+u);return s.x=n*0.5+p*Math.cos(f),s.y=r*0.5+p*Math.sin(f),s}let d=Math.max(0,n-2*c),a=Math.max(0,r-2*c),v=Math.PI*c/2,h=2*(d+a)+4*v;e=(e%h+h)%h;let g=Math.max(0,c-t+u),y=e;if(y<d)return s.x=c+y,s.y=t-u,s;if(y-=d,y<v){let m=-Math.PI/2+(v>0?y/v:0)*(Math.PI/2);return s.x=n-c+g*Math.cos(m),s.y=c+g*Math.sin(m),s}if(y-=v,y<a)return s.x=n-t+u,s.y=c+y,s;if(y-=a,y<v){let m=(v>0?y/v:0)*(Math.PI/2);return s.x=n-c+g*Math.cos(m),s.y=r-c+g*Math.sin(m),s}if(y-=v,y<d)return s.x=n-c-y,s.y=r-t+u,s;if(y-=d,y<v){let m=Math.PI/2+(v>0?y/v:0)*(Math.PI/2);return s.x=c+g*Math.cos(m),s.y=r-c+g*Math.sin(m),s}if(y-=v,y<a)return s.x=t-u,s.y=r-c-y,s;y-=a;let S=Math.PI+(v>0?y/v:0)*(Math.PI/2);return s.x=c+g*Math.cos(S),s.y=c+g*Math.sin(S),s}function bh(e,n,r,l,t,u){let i=Math.max(0,Math.min(t,Math.min(r,l)/2));if(u==="circle"){let k=2*Math.PI*i;return k<=0.0001?0:((Math.atan2(n-l/2,e-r/2)+Math.PI/2)/(2*Math.PI)*k%k+k)%k}let o=Math.max(0,r-2*i),s=Math.max(0,l-2*i),c=Math.PI*i/2,d=Math.PI/2,a=o,v=a+c,h=v+s,g=h+c,y=g+o,S=y+c,m=S+s,f=e>=i&&e<=r-i,p=n>=i&&n<=l-i;if(f&&p){let k=e,E=r-e,P=n,N=l-n,x=Math.min(k,E,P,N);return x===P?e-i:x===E?v+(n-i):x===N?g+(r-i-e):S+(l-i-n)}if(f)return n<l/2?e-i:g+(r-i-e);if(p)return e>r/2?v+(n-i):S+(l-i-n);if(e>r/2&&n<l/2){let k=Math.atan2(n-i,e-(r-i));return a+(k+d)/d*c}if(e>r/2){let k=Math.atan2(n-(l-i),e-(r-i));return h+k/d*c}if(n>l/2){let k=Math.atan2(n-(l-i),e-i);return y+(k-d)/d*c}let w=Math.atan2(n-i,e-i);return m+(w+Math.PI)/d*c}var mc={x:0,y:0},vc={x:0,y:0};function ey(e,n,r,l,t,u){return Jt(e-0.1,n,r,l,t,0,u,mc),Jt(e+0.1,n,r,l,t,0,u,vc),Math.atan2(vc.y-mc.y,vc.x-mc.x)}function Gp(e,n,r){if(e===n)return r<e?0:1;let l=Math.max(0,Math.min(1,(r-e)/(n-e)));return l*l*(3-2*l)}function ny(e){if(e.samplePoints&&e.samplePoints.length>0)return e.samplePoints.map((t,u)=>({x:t.x,y:t.y,arc:u}));let n=Fi(e.width,e.height,e.cornerRadius,e.kind),r=O.inset*(e.scale??1),l=[];for(let t=0;t<Dp;t++){let u=t/Dp*n,i=Jt(u,e.width,e.height,e.cornerRadius,r,0,e.kind);l.push({x:i.x,y:i.y,arc:u})}return l}var ry=0.05,ly=8000.000000000001,Jp=66.66666666666667,Xp=2000,hc=400,ty=2.625,uy=1.008,iy=0.31,B0=140,W0=40,$0=20,oy=34,xi=0.25,sy=0.01,qp=0.004,cy=0.5,ay=3.5,dn={x:0,y:0};function bp(e,n){let{width:r,height:l}=n,t=n.scale??1,u=Math.min(3,typeof window<"u"&&window.devicePixelRatio||1),i=Fi(r,l,n.cornerRadius,n.kind)/Bc(B0,W0,$0),o=Math.max(1,O.haloHalfLen*i),s=Math.max(0.6,O.extraHalfLen*i),c=Xh(o,t,u),d=qh(s,t,u),a=Math.ceil(Math.max(c.ay,d.ay)+O.extraOutward*i*t+2),v=document.createElement("div");v.className="metal-fx-glow-svg",v.setAttribute("aria-hidden","true");let h=document.createElement("div");h.className="metal-fx-glow-env",h.style.cssText="position:absolute;inset:0;pointer-events:none;opacity:0";let g=document.createElement("canvas");g.className="metal-fx-glow-canvas";let y=r+2*a,S=l+2*a;g.width=Math.ceil(y*u),g.height=Math.ceil(S*u),g.style.cssText=`position:absolute;left:${-a}px;top:${-a}px;width:${y}px;height:${S}px;pointer-events:none`,h.appendChild(g),v.appendChild(h),e.appendChild(v);let m=g.getContext("2d",{willReadFrequently:!!n.maskDataUrl});if(!m)throw Error("metal-fx: glow canvas 2D context unavailable");let f={wrap:v,env:h,canvas:g,ctx:m,surroundPath:null,bandPath:null,maskAlpha:null,maskReady:!1,margin:a,dpr:u,halo:c,extra:d,haloTint:{canvas:null,img:null,tint:-1,src:null},extraTint:{canvas:null,img:null,tint:-1,src:null},mO:Ml(),mI:Ml(),maskSum:Number.NaN,maskDeformed:!1,deform:null,width:r,height:l,cornerRadius:n.cornerRadius,kind:n.kind,scale:t,perim:ny(n),pointMode:!!(n.samplePoints&&n.samplePoints.length>0),currentIdx:0,appearedAt:0,glowOpacity:0,relocTween:null,relocNextIdx:-1,relocMul:0,envClock:0,cursorMode:!1,cursorArc:0,cursorTargetArc:0,lastTickMs:0,wanderS:0,wanderTargetS:0,wanderFrames:0,tintFrom:{r:255,g:255,b:255},tintTarget:{r:255,g:255,b:255},tintTween:null,tintHoldUntil:0,dX:Number.NaN,dY:Number.NaN,dAng:Number.NaN,dEX:Number.NaN,dEY:Number.NaN,dHOp:Number.NaN,dEOp:Number.NaN,dHaloTint:"",dExtraTint:"",dirty:!0,dEnv:-1};if(n.maskDataUrl){let p=new Image;p.onload=()=>{let w=document.createElement("canvas");w.width=g.width,w.height=g.height;let k=w.getContext("2d",{willReadFrequently:!0});if(!k)return;k.scale(u,u),k.drawImage(p,a,a,r,l);let E=k.getImageData(0,0,w.width,w.height).data,P=w.width*w.height,N=new Float32Array(P);for(let I=0,B=3;I<P;I++,B+=4)N[I]=E[B]/255;let x=Hc(Float32Array.from(N),w.width,w.height,ay*u),L=0;for(let I=0;I<P;I++)x[I]>L&&(L=x[I]);let T=L>0?cy/L:0,V=new Uint8ClampedArray(P);for(let I=0;I<P;I++)V[I]=Math.round(Math.max(N[I],x[I]*T)*255);f.maskAlpha=V,f.maskReady=!0,f.dirty=!0},p.src=n.maskDataUrl}else Oc(f,null);return f}function Oc(e,n){if(e.pointMode)return;let{margin:r,width:l,height:t,cornerRadius:u}=e,i=e.kind==="circle"?2:1;Ul(0,0,l,t,u,n,e.mO),Ul(i,i,l-2*i,t-2*i,Math.max(0,u-i),n,e.mI);let o=new Path2D;yc(o,e.mO,r);let s=new Path2D;yc(s,e.mO,r),yc(s,e.mI,r);let c=new Path2D;c.rect(0,0,l+2*r,t+2*r),c.addPath(o),e.surroundPath=c,e.bandPath=s,e.maskReady=!0}function yc(e,n,r){let l=n.xy;for(let t=0;t<n.n;t++){let u=l[t*2]+r,i=l[t*2+1]+r;t===0?e.moveTo(u,i):e.lineTo(u,i)}e.closePath()}function fy(e,n){if(!e)return 0;Ul(0,0,n.width,n.height,n.cornerRadius,e,n.mO);let r=0,l=n.mO.xy;for(let t=0;t<n.mO.n;t+=4)r+=l[t*2]*1.37+l[t*2+1];return r}function dy(e,n){if(e.deform=n,!e.pointMode)if(n){let r=fy(n,e);r!==e.maskSum&&(e.maskSum=r,Oc(e,n),e.maskDeformed=!0,e.dirty=!0)}else e.maskDeformed&&(e.maskSum=Number.NaN,Oc(e,null),e.maskDeformed=!1,e.dirty=!0)}function py(e,n,r,l,t="dark"){var u;let{width:i,height:o,cornerRadius:s,perim:c}=e;if(c.length===0)return!1;let d=2,a=-1,v=e.currentIdx,h=0;for(let U=0;U<c.length;U++){let Z=c[U],b=Ec(n,Z.x,Z.y,d);b>a&&(a=b,v=U),U===e.currentIdx&&(h=b)}let g=e.appearedAt>0&&r-e.appearedAt<O.minDwellMs,y=O.baseOp+(O.peakOp-O.baseOp)*Gp(O.lumLo,O.lumHi,h),S=!g&&a-h>ry,m=n.cursorLight,f=Qt.enabled&&Qt.catchLight&&!e.pointMode&&!!m&&m.w>0.02,p=Fi(i,o,s,e.kind);f&&(e.cursorTargetArc=bh(m.x,m.y,i,o,s,e.kind));let w=f?Math.min(1,O.peakOp*Qt.catchGain*m.w):0,k=e.lastTickMs>0?Math.min(200,Math.max(0.5,r-e.lastTickMs)):Jp;e.lastTickMs=r,e.envClock+=Math.min(k,oy);let E=(U)=>1-Math.pow(1-U,k/Jp),P=Math.max(1,O.relocFadeMs),N=Math.max(1,O.relocFadeOutMs),x=-2,L=-3,T=()=>{e.appearedAt=r,e.wanderS=0,e.wanderTargetS=0,e.wanderFrames=0,e.relocTween=Ut(0,1,P,Cc.smoothstep),jt(e.relocTween,e.envClock)},V=(U)=>{e.relocNextIdx=U,e.relocTween=Ut(1,0,N,Cc.smoothstep),jt(e.relocTween,e.envClock)};if((u=e.relocTween)!=null&&u.done&&e.relocTween.to===0){let U=e.relocNextIdx;if(U===x&&!f&&(U=L),U===L)e.cursorMode=!1,e.appearedAt=0,e.relocTween=null;else if(U===x)e.cursorMode=!0,e.cursorArc=e.cursorTargetArc,e.glowOpacity=w,T();else{e.currentIdx=U;let Z=c[e.currentIdx],b=Ec(n,Z.x,Z.y,d);e.glowOpacity=O.baseOp+(O.peakOp-O.baseOp)*Gp(O.lumLo,O.lumHi,b),T()}}if((!e.relocTween||e.relocTween.done)&&(e.appearedAt===0?(f?(e.cursorMode=!0,e.cursorArc=e.cursorTargetArc,e.glowOpacity=w):(e.cursorMode=!1,e.currentIdx=v,e.glowOpacity=y),T()):f!==e.cursorMode?V(f?x:L):!e.cursorMode&&S&&V(v)),e.cursorMode){f&&(e.glowOpacity=w);let U=Math.max(0.01,Math.min(1,Qt.catchFollow)),Z=1-Math.pow(1-U,k/16.666666666666668),b=e.cursorTargetArc-e.cursorArc;b=(b%p+p*1.5)%p-p/2,e.cursorArc+=b*Z}else e.glowOpacity+=(y-e.glowOpacity)*E(O.fadeRate);e.glowOpacity=Math.max(0,Math.min(1,e.glowOpacity)),e.relocMul=e.relocTween?Up(e.relocTween,e.envClock):1;let I=Fi(i,o,s,e.kind)/Bc(B0,W0,$0),B=O.wanderRange*I;e.wanderFrames+=k,e.wanderFrames>=ly&&(e.wanderTargetS=(Math.random()*2-1)*B,e.wanderFrames=0),e.wanderS+=(e.wanderTargetS-e.wanderS)*E(O.wanderLerp);let q,Y,R,z,F;if(e.pointMode){let U=c[e.currentIdx];q=U.x+e.wanderS,Y=U.y,R=0,z=q,F=Y}else{let U=e.cursorMode?e.cursorArc:c[e.currentIdx].arc+e.wanderS,Z=O.inset*e.scale;Jt(U,i,o,s,Z,0,e.kind,dn),q=dn.x,Y=dn.y,R=ey(U,i,o,s,Z,e.kind);let b=O.extraOutward*I*e.scale;Jt(U,i,o,s,Z,b,e.kind,dn),z=dn.x,F=dn.y}e.deform&&(e.deform(q,Y,dn),q=dn.x,Y=dn.y,e.deform(z,F,dn),z=dn.x,F=dn.y);let ne=t==="light",re=ne?vh(n,q,Y,d):z0(n,q,Y,d);e.tintTween?e.tintTween.done&&(ne?(e.tintFrom={r:e.tintFrom.r+(e.tintTarget.r-e.tintFrom.r)*e.tintTween.val,g:e.tintFrom.g+(e.tintTarget.g-e.tintFrom.g)*e.tintTween.val,b:e.tintFrom.b+(e.tintTarget.b-e.tintFrom.b)*e.tintTween.val},e.tintTarget={...re},e.tintTween=Ut(0,1,hc),jt(e.tintTween,r)):r>=e.tintHoldUntil&&(e.tintFrom={...e.tintTarget},e.tintTarget={...re},e.tintTween=Ut(0,1,hc),jt(e.tintTween,r),e.tintHoldUntil=r+Xp)):(e.tintFrom={...re},e.tintTarget={...re},e.tintTween=Ut(0,1,hc),jt(e.tintTween,r),e.tintHoldUntil=ne?0:r+Xp),Up(e.tintTween,r);let ie=e.tintTween.val,Q,j,$;if(ne)Q=Math.round(e.tintFrom.r+(e.tintTarget.r-e.tintFrom.r)*ie),j=Math.round(e.tintFrom.g+(e.tintTarget.g-e.tintFrom.g)*ie),$=Math.round(e.tintFrom.b+(e.tintTarget.b-e.tintFrom.b)*ie);else{let U=e.tintFrom.r+(e.tintTarget.r-e.tintFrom.r)*ie,Z=e.tintFrom.g+(e.tintTarget.g-e.tintFrom.g)*ie,b=e.tintFrom.b+(e.tintTarget.b-e.tintFrom.b)*ie,Le=Math.max(U,Z,b)||1;Q=Math.round(255*(U/Le)),j=Math.round(255*(Z/Le)),$=Math.round(255*(b/Le))}let H=`rgb(${Q},${j},${$})`,A="#ffffff";if(ne){let U=g0(Q,j,$),[Z,b,Le]=w0(U[0],Math.min(1,U[1]*ty),Math.max(iy,U[2]*uy));A=`rgb(${Z},${b},${Le})`}let me=Math.max(0,Math.min(1,l))*(e.pointMode?O.pointGain:1),ke=Math.min(1,e.glowOpacity*O.haloOpMul*me),Se=Math.min(1,e.glowOpacity*O.extraIntensity*me);if(Math.abs(e.relocMul-e.dEnv)>0.002){let U=e.relocMul>=0.998&&e.dEnv<0.998;e.dEnv=e.relocMul,e.env.style.opacity=e.relocMul.toFixed(3),U&&(e.dirty=!0)}let W=!!(e.relocTween&&!e.relocTween.done)||e.cursorMode,le=!(Math.abs(q-e.dX)<xi&&Math.abs(Y-e.dY)<xi&&Math.abs(R-e.dAng)<sy&&Math.abs(z-e.dEX)<xi&&Math.abs(F-e.dEY)<xi),Ce=!(Math.abs(ke-e.dHOp)<qp&&Math.abs(Se-e.dEOp)<qp),ve=H!==e.dHaloTint||A!==e.dExtraTint;return(e.dirty||le||Ce||ve)&&(e.dX=q,e.dY=Y,e.dAng=R,e.dEX=z,e.dEY=F,e.dHOp=ke,e.dEOp=Se,e.dHaloTint=H,e.dExtraTint=A,e.dirty=!1,my(e,q,Y,R,z,F,ke,Se,H,A)),W}function my(e,n,r,l,t,u,i,o,s,c){let{ctx:d,canvas:a,dpr:v,margin:h}=e;if(d.setTransform(1,0,0,1,0,0),d.globalCompositeOperation="source-over",d.globalAlpha=1,d.clearRect(0,0,a.width,a.height),i<=0.002&&o<=0.002||!e.maskReady)return;let g=i>0.002?Zp(e.halo,...e0(s),e.haloTint):null,y=o>0.002?c==="#ffffff"?e.extra.canvas:Zp(e.extra,...e0(c),e.extraTint):null,S=(w)=>{g&&(d.save(),d.translate(n+h,r+h),d.rotate(l),d.globalAlpha=i*w,d.drawImage(g,-e.halo.ax,-e.halo.ay,e.halo.w,e.halo.h),d.restore()),y&&(d.save(),d.translate(t+h,u+h),d.rotate(l),d.globalAlpha=o*w,d.drawImage(y,-e.extra.ax,-e.extra.ay,e.extra.w,e.extra.h),d.restore())};if(!e.pointMode&&e.surroundPath&&e.bandPath){d.save(),d.scale(v,v),d.clip(e.surroundPath,"evenodd"),S(0.5),d.restore(),d.save(),d.scale(v,v),d.clip(e.bandPath,"evenodd"),S(1),d.restore();return}d.save(),d.scale(v,v),S(1),d.restore();let m=e.maskAlpha;if(!m)return;let f=d.getImageData(0,0,a.width,a.height),p=f.data;for(let w=0,k=3;w<m.length;w++,k+=4){let E=m[w];if(E!==255){if(E===0){p[k]=0;continue}p[k]=(p[k]*E+127)/255}}d.putImageData(f,0,0)}var Ll=[255,255,255];function e0(e){if(e[0]==="#")return Ll[0]=parseInt(e.slice(1,3),16),Ll[1]=parseInt(e.slice(3,5),16),Ll[2]=parseInt(e.slice(5,7),16),Ll;let n=4,r=0,l=0;for(;n<e.length&&l<3;){let t=e.charCodeAt(n++);t>=48&&t<=57?r=r*10+(t-48):(t===44||t===41)&&(Ll[l++]=r,r=0)}return Ll}function vy(e,n){e.pointMode===n.pointMode&&(n.currentIdx=Math.min(e.currentIdx,Math.max(0,n.perim.length-1)),n.appearedAt=e.appearedAt,n.glowOpacity=e.glowOpacity,n.relocTween=e.relocTween,n.relocNextIdx=e.relocNextIdx,n.relocMul=e.relocMul,n.envClock=e.envClock,n.cursorMode=e.cursorMode,n.cursorArc=e.cursorArc,n.cursorTargetArc=e.cursorTargetArc,n.lastTickMs=e.lastTickMs,n.wanderS=e.wanderS,n.wanderTargetS=e.wanderTargetS,n.wanderFrames=e.wanderFrames,n.tintFrom=e.tintFrom,n.tintTarget=e.tintTarget,n.tintTween=e.tintTween,n.tintHoldUntil=e.tintHoldUntil,n.dEnv=e.relocMul,n.env.style.opacity=e.relocMul.toFixed(3))}var n0=Object.freeze({offsetY:1,blur:0.5,alpha:0.9,color:"#ffffff"});function hy(e,n,r){let l=Math.min(3,typeof window<"u"&&window.devicePixelRatio||1),t=Math.ceil(3*r.blur+Math.abs(r.offsetY)+1),u=n.width+2*t,i=n.height+2*t,o=document.createElement("canvas");o.className="metal-fx-rim-canvas",o.setAttribute("aria-hidden","true"),o.width=Math.ceil(u*l),o.height=Math.ceil(i*l),o.style.cssText=`position:absolute;left:${-t}px;top:${-t}px;width:${u}px;height:${i}px;pointer-events:none`;let s=o.getContext("2d"),c=document.createElement("canvas");c.width=o.width,c.height=o.height;let d=c.getContext("2d",{willReadFrequently:!0});if(!s||!d)return null;e.appendChild(o);let a={canvas:o,ctx:s,scratch:c,sctx:d,width:n.width,height:n.height,cornerRadius:n.cornerRadius,kind:n.kind,ring:n.ring,margin:t,dpr:l,opts:r,mO:Ml(),mI:Ml(),sum:Number.NaN};return A0(a,null,!0),a}function r0(e,n,r){let l=n.xy;for(let t=0;t<n.n;t++){let u=l[t*2]+r,i=l[t*2+1]+r;t===0?e.moveTo(u,i):e.lineTo(u,i)}e.closePath()}function A0(e,n,r=!1){let{width:l,height:t,cornerRadius:u,ring:i,margin:o,dpr:s}=e;Ul(0,0,l,t,u,n,e.mO),Ul(i,i,l-2*i,t-2*i,Math.max(0,u-i),n,e.mI);let c=0,d=e.mO.xy;for(let I=0;I<e.mO.n;I+=4)c+=d[I*2]*1.37+d[I*2+1];if(!r&&c===e.sum)return;e.sum=c;let{sctx:a,scratch:v,ctx:h,canvas:g,opts:y}=e,S=v.width,m=v.height;a.setTransform(1,0,0,1,0,0),a.clearRect(0,0,S,m),a.scale(s,s),a.fillStyle="#fff",a.beginPath(),r0(a,e.mO,o),r0(a,e.mI,o),a.fill("evenodd");let f=a.getImageData(0,0,S,m).data,p=S*m,w=new Float32Array(p);for(let I=0,B=3;I<p;I++,B+=4)w[I]=f[B]/255;let k=Math.round(y.offsetY*s)*S,E=new Float32Array(p);if(k>=0)for(let I=0;I<p;I++)E[I]=Math.max(0,w[I]-(I>=k?w[I-k]:0));else for(let I=0;I<p;I++)E[I]=Math.max(0,w[I]-(I-k<p?w[I-k]:0));let P=Hc(E,S,m,y.blur*s),N=parseInt(y.color.slice(1,3),16),x=parseInt(y.color.slice(3,5),16),L=parseInt(y.color.slice(5,7),16),T=h.createImageData(S,m),V=T.data;for(let I=0,B=0;I<p;I++,B+=4)V[B]=N,V[B+1]=x,V[B+2]=L,V[B+3]=Math.round(Math.min(1,P[I]*w[I]*y.alpha)*255);h.setTransform(1,0,0,1,0,0),h.putImageData(T,0,0)}function l0(e){e&&e.canvas.remove()}var Ii=12,t0=32,u0=1,i0=0.55,yy=1,gy=1,wy=0.85,ky=0,Sy=1.3,o0=3.6,Ey=0.7,Cy=1,Ny=0.52,Py=1,_y=0.044,zy=235,Ly=2.535,s0=0.7,xy=0.5,Ty=new Set(["INPUT","TEXTAREA","SELECT","OPTION"]);function Dy(e,n){let r=Math.max(e.left-n.right,n.left-e.right,0),l=Math.max(e.top-n.bottom,n.top-e.bottom,0);return Math.sqrt(r*r+l*l)}function Iy(e,n,r,l){return!(Math.min(e.bottom,n.bottom)-Math.max(e.top,n.top)<r||Math.max(e.left-n.right,n.left-e.right,0)>l)}function Ry(e,n,r,l){return Math.min(e.right,n.right)-Math.max(e.left,n.left)<r?!1:Math.max(e.top-n.bottom,n.top-e.bottom,0)<=l}function $r(e,n,r,l,t,u){let i=Math.max(0,Math.min(u,l*0.5,t*0.5)),o=e.roundRect;if(typeof o=="function"){o.call(e,n,r,l,t,i);return}e.moveTo(n+i,r),e.lineTo(n+l-i,r),e.quadraticCurveTo(n+l,r,n+l,r+i),e.lineTo(n+l,r+t-i),e.quadraticCurveTo(n+l,r+t,n+l-i,r+t),e.lineTo(n+i,r+t),e.quadraticCurveTo(n,r+t,n,r+t-i),e.lineTo(n,r+i),e.quadraticCurveTo(n,r,n+i,r)}function K0(e,n,r,l,t){if(!t.flipX&&!t.flipY){e.drawImage(n,t.sx??0,t.sy??0,r,l,t.x,t.y,t.w,t.h);return}e.save(),t.flipX&&(e.translate(t.x+t.w,0),e.scale(-1,1)),t.flipY&&(e.translate(0,t.y+t.h),e.scale(1,-1)),e.drawImage(n,t.sx??0,t.sy??0,r,l,t.flipX?0:t.x,t.flipY?0:t.y,t.w,t.h),e.restore()}var Fy=4;function Oy(e,n,r,l,t,u,i){if(l<=2*i||t<=2*i){e.beginPath(),$r(e,n,r,l,t,u),e.clip();return}e.beginPath(),$r(e,n,r,l,t,u),$r(e,n+i,r+i,l-2*i,t-2*i,Math.max(0,u-i)),e.clip("evenodd")}function My(e,n,r,l,t,u,i,o,s,c,d,a){let v=a??Math.max(1,Math.round((Ii+Fy*3)*d)),h=Math.max(0,i),g=!0;for(let y=0;y<3&&h>0.0001;y++){let S=Math.min(1,h);e.save(),Oy(e,c.x,c.y,c.w,c.h,c.r,v),e.globalCompositeOperation=g?"source-over":"lighter",g=!1,e.globalAlpha=S,K0(e,n,r,l,s),e.globalAlpha=1,e.globalCompositeOperation="destination-in",e.fillStyle=o,e.fillRect(0,0,t,u),e.restore(),h-=S}}function Y0(e,n,r,l,t,u,i){let o=i|0;if(o<1||l<=2*o||t<=2*o){e.beginPath(),$r(e,n,r,l,t,u),e.clip();return}e.beginPath(),$r(e,n,r,l,t,u),$r(e,n+o,r+o,l-2*o,t-2*o,Math.max(0,u-o)),e.clip("evenodd")}function Uy(e,n,r,l,t,u,i,o,s,c,d,a){let v=o*d,h=!0;for(let g=0;g<3&&v>0.0001;g++){let y=Math.min(1,v);e.save(),Y0(e,i.x,i.y,i.w,i.h,i.r,s),e.globalCompositeOperation=h?"source-over":"lighter",h=!1,e.globalAlpha=y,K0(e,n,r,l,a),e.globalAlpha=1,e.globalCompositeOperation="destination-in",e.fillStyle=c,e.fillRect(0,0,t,u),e.restore(),v-=y}}function jy(e,n,r,l,t,u,i,o){let s=e.createLinearGradient(l,t,u,i);s.addColorStop(0,`rgba(255,255,255,${o.toFixed(3)})`),s.addColorStop(0.5,`rgba(255,255,255,${(o*0.45).toFixed(3)})`),s.addColorStop(1,"rgba(255,255,255,0)"),e.save(),Y0(e,n.x,n.y,n.w,n.h,n.r,r),e.globalCompositeOperation="lighter",e.lineWidth=r*2,e.strokeStyle=s,e.beginPath(),$r(e,n.x,n.y,n.w,n.h,n.r),e.stroke(),e.restore()}function Z0(e){let n=getComputedStyle(e),r=[parseFloat(n.borderTopLeftRadius)||0,parseFloat(n.borderTopRightRadius)||0,parseFloat(n.borderBottomRightRadius)||0,parseFloat(n.borderBottomLeftRadius)||0].filter((l)=>l>0);return r.length?Math.min.apply(null,r):0}function G0(e){let n=getComputedStyle(e),r=Math.max(parseFloat(n.borderTopWidth)||0,parseFloat(n.borderRightWidth)||0,parseFloat(n.borderBottomWidth)||0,parseFloat(n.borderLeftWidth)||0),l=0,t=0,u=n.boxShadow;if(u&&u!=="none"){let o=u.replace(/rgba?\([^)]*\)/g,(d)=>d.replace(/,/g,"\x00")).split(/,\s*/),s=1/0,c=1/0;for(let d of o){let a=d.match(/-?\d+(?:\.\d+)?px/g);if(!a||a.length<4)continue;let v=parseFloat(a[3]);v>0&&(/\binset\b/.test(d)?v<s&&(s=v):v<c&&(c=v))}Number.isFinite(s)&&(l=s),Number.isFinite(c)&&(t=c)}let i=Math.max(r,t);return{width:Math.max(r,l,t)||1,outerCssPx:i}}function c0(e){e.cornerRadius=Z0(e.el);let n=G0(e.el);e.hairlineWidth=n.width,e.hairlineOuterCssPx=n.outerCssPx}function Vy(e){typeof ResizeObserver<"u"&&(e.resizeObserver=new ResizeObserver(()=>c0(e)),e.resizeObserver.observe(e.el)),typeof MutationObserver<"u"&&(e.mutationObserver=new MutationObserver(()=>c0(e)),e.mutationObserver.observe(e.el,{attributes:!0,attributeFilter:["style","class"]}))}function Qy(e){var n,r;(n=e.resizeObserver)==null||n.disconnect(),e.resizeObserver=null,(r=e.mutationObserver)==null||r.disconnect(),e.mutationObserver=null}var Sr=new Set,Hy=Object.freeze({enabled:!0,radius:11.5,strength:0.57,penumbra:0.55,falloff:0.21,edgeFade:0.7,softness:0.24,repaintMs:36}),Ui={...Hy};var gr=null,gc=0,a0=0,f0=!1;function Wc(){gc!==0||typeof requestAnimationFrame>"u"||(gc=requestAnimationFrame((e)=>{if(gc=0,e-a0<Ui.repaintMs){Wc();return}a0=e,X0()}))}var Oi=!1;function By(e,n){let r=Ui.radius;for(let l of Sr){let t=l.anchorEl.getBoundingClientRect(),u=l.el.getBoundingClientRect(),i=Math.min(t.left,u.left)-r,o=Math.max(t.right,u.right)+r,s=Math.min(t.top,u.top)-r,c=Math.max(t.bottom,u.bottom)+r;if(e>=i&&e<=o&&n>=s&&n<=c)return!0}return!1}function d0(e){if(gr={x:e.clientX,y:e.clientY},!Ui.enabled)return;let n=By(e.clientX,e.clientY);(n||Oi)&&Wc(),Oi=n}function Ti(){gr=null,Oi&&Wc(),Oi=!1}function J0(e){typeof document>"u"||e===f0||(f0=e,e?(document.addEventListener("pointermove",d0,{passive:!0}),document.addEventListener("pointerleave",Ti),window.addEventListener("blur",Ti)):(document.removeEventListener("pointermove",d0),document.removeEventListener("pointerleave",Ti),window.removeEventListener("blur",Ti),gr=null))}function Wy(e,n,r,l,t,u,i,o,s){if(!gr)return;let c=Ui;if(!c.enabled||c.strength<=0)return;let d=c.radius,a,v,h,g,y,S;if(t){let R=r.left>=l.right;a=R?l.right:r.right,v=R?r.left:l.left,h=gr.x,g=gr.y,y=Math.max(r.top,l.top),S=Math.min(r.bottom,l.bottom)}else{let R=r.top>=l.bottom;a=R?l.bottom:r.bottom,v=R?r.top:l.top,h=gr.y,g=gr.x,y=Math.max(r.left,l.left),S=Math.min(r.right,l.right)}let m=Math.min(a,v),f=Math.max(a,v),p=Math.max(1,f-m);if(h<m-d||h>f+d||g<y-d||g>S+d)return;let w=Math.max(0,Math.min(1,Math.abs(h-a)/p)),k=Math.max(0.5,d*c.edgeFade),E=Math.min(1,Math.min(h-(m-d),f+d-h)/k),P=Math.min(1,Math.min(g-(y-d),S+d-g)/k),N=c.strength*(1-c.falloff*w)*E*P;if(N<=0.001)return;let x=d*s*(1+c.penumbra*w),L=t?(g-l.top+o)*s:(g-l.left+o)*s,T=Math.max(0,Math.min(0.5,(1-c.softness)*0.5)),V=Math.max(0.001,0.5-T),I=t?i:u,B=Math.max(0,Math.floor(L-x)),q=Math.min(I,Math.ceil(L+x));if(q<=B)return;let Y=new Float32Array(q-B);for(let R=B;R<q;R++){let z=(R+0.5-(L-x))/(2*x),F=z<V?z/V:z>1-V?(1-z)/V:1;Y[R-B]=1-N*Math.max(0,Math.min(1,F))}for(let R of[e,n]){let z=t?0:B,F=t?B:0,ne=t?u:q-B,re=t?q-B:i,ie=R.getImageData(z,F,ne,re),Q=ie.data;if(t)for(let j=0;j<re;j++){let $=Y[j];if(!($>=0.999))for(let H=j*ne*4+3,A=(j+1)*ne*4;H<A;H+=4)Q[H]=Q[H]*$}else for(let j=0;j<re;j++)for(let $=0;$<ne;$++){let H=Y[$];if(H>=0.999)continue;let A=(j*ne+$)*4+3;Q[A]=Q[A]*H}R.putImageData(ie,z,F)}}var An=null,Tl=null,Dl=null,Il=null;function $y(e,n){return An||(An=document.createElement("canvas"),Tl=document.createElement("canvas"),Dl=An.getContext("2d",{alpha:!0}),Il=Tl.getContext("2d",{alpha:!0})),!Dl||!Il||!An||!Tl?!1:(An.width!==e&&(An.width=e,Tl.width=e),An.height!==n&&(An.height=n,Tl.height=n),Dl.setTransform(1,0,0,1,0,0),Il.setTransform(1,0,0,1,0,0),Dl.globalCompositeOperation="source-over",Il.globalCompositeOperation="source-over",Dl.clearRect(0,0,e,n),Il.clearRect(0,0,e,n),!0)}function Ay(e,n,r,l=1){if(typeof document>"u"||Ty.has(e.tagName))return null;for(let g of Sr)if(g.el===e)return g.strength=l,g;let t=document.createElement("div");t.setAttribute("data-metal-fx-reflection",""),t.setAttribute("aria-hidden","true");let u=document.createElement("canvas");u.className="metal-fx-reflection-canvas";let i=u.getContext("2d",{alpha:!0,willReadFrequently:!0});if(!i)return null;let o=document.createElement("canvas");o.className="metal-fx-reflection-stroke-canvas";let s=o.getContext("2d",{alpha:!0,willReadFrequently:!0});if(!s)return null;t.appendChild(u),t.appendChild(o);let c=getComputedStyle(e),d=!1;c.position==="static"&&(e.style.position="relative",d=!0);let a=!1;c.isolation!=="isolate"&&(e.style.isolation="isolate",a=!0),e.setAttribute("data-metal-fx-reflect-host",""),e.insertBefore(t,e.firstChild);let v=G0(e),h={el:e,anchor:n,anchorEl:r,strength:l,wrap:t,canvas:u,ctx:i,strokeCanvas:o,strokeCtx:s,cornerRadius:Z0(e),hairlineWidth:v.width,hairlineOuterCssPx:v.outerCssPx,appliedPositionRelative:d,appliedIsolation:a,resizeObserver:null,mutationObserver:null};return Vy(h),Sr.add(h),J0(!0),h}function Ky(e){for(let n of Sr)if(n.el===e){Qy(n),n.canvas.width=0,n.canvas.height=0,n.strokeCanvas.width=0,n.strokeCanvas.height=0,n.wrap.parentNode===n.el&&n.el.removeChild(n.wrap),n.el.removeAttribute("data-metal-fx-reflect-host"),n.appliedPositionRelative&&(n.el.style.position=""),n.appliedIsolation&&(n.el.style.isolation=""),Sr.delete(n),Sr.size===0&&J0(!1);return}}function Yy(e,n,r,l,t){if(l<1||t<1)return null;let u=e.getContext("2d");if(!u)return null;let i=u.getImageData(n,r,l,t).data,o=l,s=t,c=-1,d=-1;for(let a=0;a<t;a++){let v=a*l;for(let h=0;h<l;h++)i[(v+h)*4+3]>8&&(h<o&&(o=h),h>c&&(c=h),a<s&&(s=a),a>d&&(d=a))}return c<0?null:{x:n+o,y:r+s,w:c-o+1,h:d-s+1}}function X0(){if(Sr.size===0)return;let e=typeof window<"u"&&window.devicePixelRatio||1,n=new Map;for(let r of Sr){let l=r.el.getBoundingClientRect(),t=n.get(r.anchorEl);if(t||(t=r.anchorEl.getBoundingClientRect(),n.set(r.anchorEl,t)),l.width<1||l.height<1||t.width<1||t.height<1)continue;let u=r.el.hasAttribute("data-metal-fx-text");if(u&&!r.glyphStyled&&(r.canvas.style.filter="blur(0.4px) saturate(1.35) brightness(1.2)",r.glyphStyled=!0),!Iy(t,l,u0,t0)&&!Ry(t,l,u0,t0)){r.canvas.width!==1&&(r.canvas.width=1,r.canvas.height=1),r.strokeCanvas.width!==1&&(r.strokeCanvas.width=1,r.strokeCanvas.height=1);continue}let i=u&&!!r.anchor.mask;i&&!r.anchor.wantRaw&&(r.anchor.wantRaw=!0),r.anchor.wantRing||(r.anchor.wantRing=!0);let o=!!r.anchor.deform&&!!r.anchor.ringCanvas,s=i&&r.anchor.rawCanvas?r.anchor.rawCanvas:o?r.anchor.ringCanvas:r.anchor.canvas,c=Math.round(r.anchor.overscan*e),d=c,a=c,v=(s.width|0)-2*c,h=(s.height|0)-2*c;if(r.anchor.mask&&!i){let re=Yy(s,d,a,v,h);re&&(d=re.x,a=re.y,v=re.w,h=re.h)}if(v<4||h<4)continue;let g=(t.left+t.right)*0.5,y=(t.top+t.bottom)*0.5,S=(l.left+l.right)*0.5,m=(l.top+l.bottom)*0.5,f=g-S,p=y-m,w=Math.max(t.left-l.right,l.left-t.right,0),k=Math.max(t.top-l.bottom,l.top-t.bottom,0),E=w>=k,P=Dy(t,l),N=1-Math.min(1,P/Ii);N=N*N*(3-2*N);let x=i0+(yy-i0)*N,L=Math.min(o0,x*Sy*Ey)*r.strength,T=t.left>=l.left&&t.right<=l.right&&t.top>=l.top&&t.bottom<=l.bottom?[!0,!1]:[E],V=r.anchor.scale??1,I=Math.max(Cy*V,r.hairlineWidth),B=Math.max(1,Math.round(I*e)),q=Math.max(1,Math.round(Math.max(Py*V,r.hairlineWidth)*e)),Y=r.hairlineOuterCssPx;r.wrap.style.inset=`${-Y}px`,r.wrap.style.borderRadius=`${Math.max(0,r.cornerRadius)}px`;let R=Math.max(1,Math.round((l.width+Y*2)*e)),z=Math.max(1,Math.round((l.height+Y*2)*e));r.canvas.width!==R&&(r.canvas.width=R),r.canvas.height!==z&&(r.canvas.height=z),r.strokeCanvas.width!==R&&(r.strokeCanvas.width=R),r.strokeCanvas.height!==z&&(r.strokeCanvas.height=z);let F=r.ctx;F.setTransform(1,0,0,1,0,0),F.clearRect(0,0,R,z);let ne=r.strokeCtx;ne.setTransform(1,0,0,1,0,0),ne.clearRect(0,0,R,z);for(let[re,ie]of T.entries()){let Q=re>0&&$y(R,z),j=Q?Dl:F,$=Q?Il:ne,H=Math.min((u?Ii*1.5:Ii)*e,Math.max(R,z)),A,me,ke,Se;ie?(A=f>0?R:0,ke=f>0?R-H:H,me=z*0.5,Se=z*0.5):(me=p>0?z:0,Se=p>0?z-H:H,A=R*0.5,ke=R*0.5);let W=F.createLinearGradient(A,me,ke,Se);W.addColorStop(0,`rgba(0,0,0,${gy})`),W.addColorStop(0.5,`rgba(0,0,0,${wy})`),W.addColorStop(1,`rgba(0,0,0,${ky})`);let le=v/e,Ce=u?Math.max(1,Math.min(ie?R:z,Math.round(ie?v:h))):Math.max(1,Math.round(zy*Math.max(0.1,le/140)*e)),ve,U,Z,b,Le=!1,Gn=!1;if(ie){let X=Math.max(t.top,l.top),ue=Math.min(t.bottom,l.bottom);Le=!0,ve=f>0?R-Ce:0,U=Math.round((X-l.top+Y)*e),Z=Ce,b=Math.max(1,Math.round((ue-X)*e))}else{let X=Math.max(t.left,l.left),ue=Math.min(t.right,l.right);Gn=!0,ve=Math.round((X-l.left+Y)*e),U=p>0?z-Ce:0,Z=Math.max(1,Math.round((ue-X)*e)),b=Ce}let Dn={x:ve,y:U,w:Z,h:b,flipX:Le,flipY:Gn,sx:d,sy:a},Xe={x:0,y:0,w:R,h:z,r:Math.max(0,r.cornerRadius*e)},M=u?Math.min(1,L*s0):Math.min(o0,L*Ly*s0*xy);My(j,s,v,h,R,z,M,W,Dn,Xe,e,u?Math.max(R,z):void 0),u||(Uy($,s,v,h,R,z,Xe,L,B,W,Ny,Dn),jy($,Xe,q,A,me,ke,Se,Math.min(0.85,_y*L))),Q&&(F.globalCompositeOperation="lighter",F.drawImage(An,0,0),ne.globalCompositeOperation="lighter",ne.drawImage(Tl,0,0))}for(let re of T)Wy(F,ne,t,l,re,R,z,Y,e);F.globalCompositeOperation="source-over",ne.globalCompositeOperation="source-over"}}var wc=!1,p0=0;function Zy(){wc||(wc=!0,!(typeof requestAnimationFrame>"u")&&requestAnimationFrame((e)=>{wc=!1,!(e-p0<Kv)&&(p0=e,X0())}))}var m0="metal-fx-styles",Gy=`
.metal-fx-root {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  isolation: isolate;
  overflow: visible;
  background: #272727;
  color: #f8f8f8;
}
.metal-fx-root[data-theme='light'] {
  background: #ffffff;
  color: #1d1d1d;
}

.metal-fx-root::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  pointer-events: none;
  z-index: 2;
  box-shadow: inset 0 0 50px 0 rgba(255, 255, 255, 0.02);
}
.metal-fx-root[data-theme='light']::before {
  box-shadow: inset 0 0 50px 0 rgba(0, 0, 0, 0.02);
}

.metal-fx-root::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  pointer-events: none;
  z-index: 4;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.1);
}
.metal-fx-root[data-theme='light']::after {
  box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.06);
}
/* Circle variant gets a thicker outer rim than the button variant. */
.metal-fx-root[data-variant='circle']::after {
  box-shadow: inset 0 0 0 2px rgba(255, 255, 255, 0.1);
}
.metal-fx-root[data-theme='light'][data-variant='circle']::after {
  box-shadow: inset 0 0 0 2px rgba(0, 0, 0, 0.06);
}

.metal-fx-canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  display: block;
  z-index: 0;
  pointer-events: none;
  border-radius: inherit;
}

/* The inner spacer — defines the inset geometry where the metal ring meets
   the interior (3 px for Button, 1-2 px for Circle) and carries the Circle dark
   hairline ('box-shadow: inset' rules below). Intentionally transparent so
   the wrapper's background propagates through to the punched shader centre,
   giving consumers a single surface tone to override. See "Single-surface
   background" in the file header for the rationale. */
.metal-fx-inner {
  position: absolute;
  inset: 3px;
  border-radius: inherit;
  z-index: 1;
  pointer-events: none;
}

.metal-fx-root[data-variant='button'][data-shape='pill'] .metal-fx-inner {
  border-radius: calc(var(--mfx-radius, 20px) - 3px);
}
.metal-fx-root[data-variant='button'][data-shape='circle'] .metal-fx-inner {
  border-radius: calc(var(--mfx-radius, 16px) - 3px);
}
.metal-fx-root[data-variant='circle'][data-shape='pill'] .metal-fx-inner {
  inset: 0;
  border-radius: var(--mfx-radius, 20px);
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.45);
}
.metal-fx-root[data-variant='circle'][data-shape='circle'] .metal-fx-inner {
  inset: 0;
  border-radius: var(--mfx-radius, 16px);
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.45);
}
/* Circle-variant hairline alpha — light mode.
   Source-of-truth: index.html L2261-2267. The 0.45-alpha black inset that
   reads as a single-pixel frame against the dark interior is too heavy
   on a #ffffff inner: it ends up looking like a hard 2-px black ring
   against the iridescent shader. Suppressed entirely (alpha 0) — the
   shader's own iridescent rim already defines the silhouette in light
   mode, so an extra dark hairline only competes with it. The rule is
   kept (rather than deleted) as a tunable hook in case a future variant
   wants to re-introduce a soft edge. NOTE: we keep the dark-mode inset
   and border-radius values because — unlike index.html — our renderer
   does NOT overscan the canvas in light mode, so there is no 1-px gap
   between inner element and shader to compensate for. */
.metal-fx-root[data-theme='light'][data-variant='circle'][data-shape='pill'] .metal-fx-inner,
.metal-fx-root[data-theme='light'][data-variant='circle'][data-shape='circle'] .metal-fx-inner {
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0);
}

/* ─── Combined glow SVG (z=3) ──────────────────────────────────────────────
   Single SVG per instance that holds BOTH the wide-halo group
   (#mfx_haloTravel) and the catch-light group (#mfx_extraTravel), exactly
   mirroring canonical's _buildGlowSvgInner (index.html L8078). One
   mix-blend-mode: screen lifts the combined composite onto the shader
   ring; per-frame opacity attributes on each inner group still drive the
   independent fade-in / fade-out cycles for the halo and the catch-light.

   Why a single SVG: the circle variant anchors halo + catch-light at the same
   perimeter point, so they overlap in the bright zone. Two separately-
   screened SVGs would double-screen the overlap (A + B + C - AB - AC -
   BC + ABC instead of A + B + C - AB - AC once both groups composite
   in source-over inside one SVG and then screen against the host once).
   That overlap looked muted versus canonical specifically on the circle
   variant where both layers travel together.

   Source-of-truth opacity: #btnGlowSvg drops to 0.7 in dark and 0.2746 in
   light (index.html L632/L643). */
.metal-fx-glow-svg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  overflow: visible;
  z-index: 3;
  pointer-events: none;
  opacity: 0.7;
}
.metal-fx-root[data-theme='light'] .metal-fx-glow-svg {
  /* Light-mode 1-px overscan mirrors .btn-glow-svg in metal.html so the
     halo stays glued to the visible silhouette (the shader ring there sits
     1 px outside the host's padding box). */
  inset: -1px;
  width: calc(100% + 2px);
  height: calc(100% + 2px);
  mix-blend-mode: multiply;
  /* Source-of-truth: html[data-theme="light"] #btnGlowSvg { opacity: 0.2746 }
     → −35 % from 0.4225 from the original 0.7 dark-mode opacity. */
  opacity: 0.2746;
  filter: saturate(5.355) brightness(0.78);
}
/* Circle light-mode small variants (e.g. 36×36 send button): the geometrically
   shrunk halo loses density when multiplied against #ffffff. Mirror the
   canonical override at index.html L2316 — bump saturation + drop brightness
   so the small glow holds together visually. */
.metal-fx-root[data-variant='circle'][data-shape='circle'][data-theme='light'] .metal-fx-glow-svg {
  filter: saturate(7.5) brightness(0.6);
}

/* The wrapped child — hoisted into z=5 so it sits above every overlay, with
   normalized chrome so consumer button styles don't fight the metal frame. */
.metal-fx-content {
  position: relative;
  z-index: 5;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  pointer-events: none;
}
.metal-fx-content > * {
  pointer-events: auto;
}
.metal-fx-root[data-normalize='true'] .metal-fx-content > * {
  background: transparent !important;
  border: 0 !important;
  outline: 0 !important;
  box-shadow: none !important;
  /* Sizing: we deliberately DO NOT force \`width: 100%; height: 100%\` on the
     child here. That used to be the contract ("the wrapper is the visible
     button surface; the child stretches to fill it"), but it created a cyclic
     percentage dependency: the wrapper is \`inline-flex\` with no intrinsic
     size, .metal-fx-content is \`width/height: 100%\` of the wrapper, and the
     child was \`100%\` of .metal-fx-content. With nothing breaking the cycle,
     icon-only / class-sized children collapsed.

     The new contract: the child sizes itself (intrinsic content, CSS class,
     or inline style — all work), and the wrapper's \`inline-flex\` wraps it
     tightly. Consumers who want a metal frame BIGGER than the child (e.g.
     padding around an icon) size <MetalFx style={{ width, height }}> AND
     explicitly set width/height on the child to fill (or accept that the
     child renders at its intrinsic size, centered).

     Typography is intentionally NOT touched. We used to apply
     \`color: inherit; font: inherit;\` here to "match" the wrapper, but
     \`font: inherit\` is a shorthand that overrides font-family, font-size,
     font-weight, AND line-height on the child — which (a) shrank the
     button height (line-height changes propagate through the flex
     content box) and (b) scaled em-based icons / font-icons inside the
     child to whatever the wrapper inherited. The wrapper now stays out
     of the child's typography entirely; consumers who want typographic
     normalization can apply it themselves on the child element. */
}

[data-metal-fx-reflection] {
  position: absolute;
  inset: 0;
  pointer-events: none;
  border-radius: inherit;
  overflow: hidden;
  z-index: 0;
  isolation: isolate;
}
.metal-fx-reflection-canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  display: block;
  filter: blur(4px) saturate(1.2) brightness(1.58);
}
.metal-fx-reflection-stroke-canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  display: block;
  filter: saturate(1.35) brightness(1.75);
}
/* Hosts that participate as reflection targets need positioning + isolation
   so the wrap composites only against the host (not the parent stack). The
   wrap injects these inline as well, but stating them here keeps reflections
   working on hosts that already have other inline styles applied. */
[data-metal-fx-reflect-host] {
  isolation: isolate;
}
`,kc=!1;function Jy(){if(kc||typeof document>"u")return;if(document.getElementById(m0)){kc=!0;return}let e=document.createElement("style");e.nonce="oracle-onboarding-effects",e.id=m0,e.textContent=Gy,document.head.appendChild(e),kc=!0}Jy();var Xy={position:"absolute",inset:0,width:"100%",height:"100%"},qy={position:"absolute",inset:3},by={position:"absolute",inset:0,pointerEvents:"none",zIndex:3,borderRadius:"inherit"},eg={position:"absolute",inset:0,pointerEvents:"none",zIndex:4},At=new Map;function ng(){let e=globalThis;e.__MFX_DEBUG__&&(e.__mfxGlow=At)}Ph((e,n)=>{let r=At.get(e);return r?py(r.handles,e,n,e.opacityMul*e.glowGain,r.themeRef.current):!1});function rg(e){let[n,r]=J.useState(()=>e!=="auto"?e:typeof window>"u"||!window.matchMedia||window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light");return J.useEffect(()=>{if(e!=="auto"){r(e);return}if(typeof window>"u"||!window.matchMedia)return;let l=window.matchMedia("(prefers-color-scheme: dark)"),t=()=>r(l.matches?"dark":"light");return t(),l.addEventListener("change",t),()=>l.removeEventListener("change",t)},[e]),n}var q0=J.forwardRef(function({children:e,variant:n="button",preset:r="chromatic",theme:l="auto",strength:t=1,glowGain:u=1,paused:i=!1,borderRadius:o,normalizeHostStyles:s=!0,reflectionTargets:c,disableGlow:d=!1,innerShadow:a,shaderScale:v,ringCssPx:h,scale:g=1,mask:y,glowMode:S="mask",className:m,style:f,...p},w){let k=J.useRef(null),E=J.useRef(null),P=J.useRef(null),N=J.useRef(null),x=J.useRef(null),L=J.useRef(null),T=J.useRef(null),V=J.useRef(null),I=J.useRef("dark"),B=J.useRef(0),[q,Y]=J.useState(!1),R=rg(l),z=J.useMemo(()=>ah(),[]);I.current=R;let F=n==="circle"?"circle":"pill",ne=!d;J.useImperativeHandle(w,()=>k.current,[]);let re=(Q,j)=>{if(F==="circle")return Math.min(Q,j)/2;let $=typeof o=="number"?o:(()=>{var H;let A=(H=L.current)==null?void 0:H.firstElementChild;if(A){let me=parseFloat(getComputedStyle(A).borderTopLeftRadius);if(Number.isFinite(me)&&me>0)return me}return B.current})();return Math.min($,Math.min(Q,j)/2)};J.useEffect(()=>{z&&Nh(r,R)},[r,R,z]),J.useEffect(()=>{let Q=T.current;Q&&zl(Q,{mask:y??null})},[y]),J.useEffect(()=>{let Q=T.current;Q&&zl(Q,{paused:i})},[i]),J.useEffect(()=>{let Q=T.current;if(!Q)return;let j={};v!==void 0&&(j.shaderScale=v),h!==void 0&&(j.ringCssPx=h),g!==void 0&&(j.scale=g),Object.keys(j).length>0&&zl(Q,j)},[v,h,g]),J.useLayoutEffect(()=>{let Q=E.current,j=k.current,$=P.current;if(!Q||!j||!z)return;{let M=getComputedStyle(j),X=parseFloat(M.borderTopLeftRadius);B.current=Number.isFinite(X)?X:0}let H=()=>{let M=j.getBoundingClientRect(),X=Math.max(1,Math.round(M.width)),ue=Math.max(1,Math.round(M.height));return{cssWidth:X,cssHeight:ue,cornerRadius:re(X,ue)}},A=H();T.current=yh({onComposite:()=>{let M=T.current,X=V.current;M&&X&&dy(X,M.deform);let ue=x.current;M&&ue&&A0(ue,M.deform)},hostCanvas:Q,cssWidth:A.cssWidth,cssHeight:A.cssHeight,cornerRadius:A.cornerRadius,kind:F,paused:i,shaderScale:v,ringCssPx:h,scale:g,mask:y??null,onFirstCopy:()=>Y(!0)}),j.style.setProperty("--mfx-radius",`${A.cornerRadius}px`),j.style.borderRadius=`${A.cornerRadius}px`;let me=(M,X)=>{if(!y||S==="ring")return{};let ue=window.devicePixelRatio||1,We=document.createElement("canvas");We.width=Math.max(1,Math.round(M*ue)),We.height=Math.max(1,Math.round(X*ue));let bt=We.getContext("2d");if(!bt)return{};bt.fillStyle="#fff",y(bt,We.width,We.height,ue);let pm=bt.getImageData(0,0,We.width,We.height).data,Jc=[],eu=Math.max(1,Math.round(2*ue));for(let nu=eu>>1;nu<We.height;nu+=eu)for(let ru=eu>>1;ru<We.width;ru+=eu)pm[(nu*We.width+ru)*4+3]>128&&Jc.push({x:ru/ue,y:nu/ue});return{samplePoints:Jc,maskDataUrl:We.toDataURL("image/png")}};$&&(V.current=bp($,{width:A.cssWidth,height:A.cssHeight,cornerRadius:A.cornerRadius,kind:F,scale:g,...me(A.cssWidth,A.cssHeight)}));let ke=(M)=>{if(!$)return;let X=V.current;$.innerHTML="",V.current=bp($,{width:M.cssWidth,height:M.cssHeight,cornerRadius:M.cornerRadius,kind:F,scale:g,...me(M.cssWidth,M.cssHeight)}),X&&vy(X,V.current);let ue=T.current;ue&&V.current&&At.set(ue,{handles:V.current,themeRef:I})},Se=()=>a?a===!0?n0:{...n0,...a}:null,W=(M)=>{let X=N.current,ue=T.current;l0(x.current),x.current=null;let We=Se();!X||!ue||!We||(x.current=hy(X,{width:M.cssWidth,height:M.cssHeight,cornerRadius:M.cornerRadius,kind:F,ring:ue.ringCssPx},We))};W(A);let le=0,Ce=A.cssWidth,ve=A.cssHeight,U=A.cornerRadius,Z=new ResizeObserver(()=>{le===0&&(le=requestAnimationFrame(()=>{le=0;let M=H(),X=T.current;!X||Math.abs(M.cssWidth-Ce)<0.5&&Math.abs(M.cssHeight-ve)<0.5&&Math.abs(M.cornerRadius-U)<0.5||(Ce=M.cssWidth,ve=M.cssHeight,U=M.cornerRadius,zl(X,{cssWidth:M.cssWidth,cssHeight:M.cssHeight,cornerRadius:M.cornerRadius}),j.style.setProperty("--mfx-radius",`${M.cornerRadius}px`),j.style.borderRadius=`${M.cornerRadius}px`,ke(M),W(M))}))});Z.observe(j);let b=null,Le=()=>{let M=T.current;if(M&&Eh(M)){let X=H();ke(X),W(X)}Gn()},Gn=()=>{b==null||b.removeEventListener("change",Le),b=typeof window.matchMedia=="function"?window.matchMedia(`(resolution: ${window.devicePixelRatio||1}dppx)`):null,b==null||b.addEventListener("change",Le)};Gn();let Dn=Dh((M)=>{M&&T.current&&ke(H())}),Xe=null;return typeof IntersectionObserver<"u"&&(Xe=new IntersectionObserver((M)=>{let X=T.current;if(X)for(let ue of M)Sh(X,ue.isIntersecting)},{rootMargin:"64px"}),Xe.observe(j)),T.current&&V.current&&(At.set(T.current,{handles:V.current,themeRef:I}),wh(T.current)),Mh(),ng(),()=>{Uh(),l0(x.current),x.current=null,Z.disconnect(),b==null||b.removeEventListener("change",Le),Xe==null||Xe.disconnect(),Dn(),le!==0&&cancelAnimationFrame(le);let M=T.current;M&&(At.delete(M),kh(M),gh(M)),T.current=null,V.current=null,$&&($.innerHTML="")}},[F]),J.useEffect(()=>{let Q=T.current;Q&&zl(Q,{opacityMul:Math.max(0,Math.min(1,t)),glowGain:Math.max(0,u)})},[t,u,n]),J.useEffect(()=>{let Q=T.current,j=k.current;if(!Q||!j||!c||R!=="dark")return;Q.onAfterFrame=Zy;let $=c.flatMap((H)=>{let A="current"in H?H:H.ref,me="current"in H?1:H.strength??1;return A.current?[{el:A.current,strength:me}]:[]});for(let{el:H,strength:A}of $)Ay(H,Q,j,A);return()=>{Q.onAfterFrame=void 0;for(let{el:H}of $)Ky(H)}},[c,R]),J.useEffect(()=>{let Q=k.current,j=T.current;if(!Q||!j)return;let $=re(j.cssWidth,j.cssHeight);zl(j,{cornerRadius:$}),Q.style.setProperty("--mfx-radius",`${$}px`),Q.style.borderRadius=`${$}px`},[o,R,n,F]);let ie=J.useMemo(()=>({...f,"--mfx-strength":String(Math.min(1,Math.max(0,t))),opacity:q?1:0,visibility:q?"visible":"hidden",transition:q?"opacity 0.15s ease-out":"none"}),[f,t,q]);return z?Je.jsxs("div",{...p,ref:k,className:m?`metal-fx-root ${m}`:"metal-fx-root","data-variant":n,"data-shape":F,"data-theme":R,"data-paused":i?"true":void 0,"data-normalize":s?"true":"false",style:ie,children:[Je.jsx("canvas",{ref:E,className:"metal-fx-canvas",style:Xy}),Je.jsx("div",{className:"metal-fx-inner","aria-hidden":"true",style:qy}),Je.jsx("div",{ref:P,"aria-hidden":"true",style:{...by,display:ne?void 0:"none"}}),a?Je.jsx("div",{ref:N,"aria-hidden":"true",style:eg}):null,Je.jsx("div",{ref:L,className:"metal-fx-content",children:e})]}):Je.jsx("div",{...p,ref:k,className:m?`metal-fx-fallback ${m}`:"metal-fx-fallback","data-metal-fx-unsupported":"",style:{display:"inline-flex",...f},children:e})});q0.displayName="MetalFx";var lg={offsetY:1,blur:0.5,alpha:0.9},Jg=Object.freeze({metalOpacity:0.62,shaderScale:2.8,glowGain:2.5,innerShadow:lg});var xl=55.556,Mc=45,v0=25,tg=26.667,h0=(Mc-tg)/2,y0={position:"absolute",inset:0,pointerEvents:"none"},ug=(e,n)=>`inset 0px 0px ${8.333*e}px 0px rgba(255,255,255,${n}), inset 0px 0px ${8.333*e}px 0px rgba(255,255,255,${n}), inset 0px 0px 0px ${0.833*e}px rgba(255,255,255,0.5), inset 0px ${0.833*e}px 0px 0px rgba(255,255,255,0.78)`,Vt=Object.freeze({metalOpacity:0.8,shaderScale:1.6,core:Object.freeze({r:46,blur:100,a:0.94,size:49}),gradient:0,glow:0.41});function b0({children:e="New",strength:n=1,theme:r,scale:l=1,reflectionTargets:t,metalOpacity:u=Vt.metalOpacity,shaderScale:i=Vt.shaderScale,core:o=Vt.core,gradient:s=Vt.gradient,glow:c=Vt.glow,textColor:d="#323232"}){let a=J.useRef(null),v=u,h=J.useCallback((g,y,S,m)=>{g.beginPath(),g.roundRect(0,0,y,S,xl*m),g.fill()},[]);return Je.jsx(q0,{ref:a,preset:"chromatic",theme:r,strength:n*v,shaderScale:i,mask:h,glowMode:"ring",reflectionTargets:t,borderRadius:xl*l,style:{background:"#ffffff",borderRadius:xl*l},children:Je.jsxs("div",{style:{position:"relative",width:Mc*l,height:v0*l,borderRadius:xl*l},children:[Je.jsx("div",{"aria-hidden":"true",style:{...y0,borderRadius:xl*l,background:`radial-gradient(ellipse ${o.size}% ${o.size}% at 50% 50%, rgba(255,255,255,1) ${o.r}%, rgba(255,255,255,0) ${Math.min(100,o.r+o.blur)}%)`,opacity:o.a}}),Je.jsx("div",{"aria-hidden":"true",style:{...y0,borderRadius:xl*l,background:`linear-gradient(to bottom, rgba(255,255,255,${s}), rgba(255,255,255,0))`,boxShadow:ug(l,c)}}),Je.jsx("span",{style:{position:"relative",display:"flex",alignItems:"center",justifyContent:"center",boxSizing:"border-box",width:Mc*l,height:v0*l,paddingLeft:h0*l,paddingRight:h0*l,font:`600 ${12.222*l}px/1.4 Inter, sans-serif`,color:d,letterSpacing:0,whiteSpace:"nowrap"},"aria-label":e,children:e})]})})}var ig=Object.freeze({enabled:!0,applyTo:"ring",strength:0.74,fadeInMs:200,fadeOutMs:350,smoothMs:140,reach:36,blob:13,liquidBlob:10,maxDisp:9,gain:0.6,pressGain:0.55,pullGain:0.49,press:5,liquid:7.5,liquidReach:8,liquidStiffness:53,liquidDamping:9,stiffness:260,damping:13,mass:1,follow:0.32,mapRes:2,smooth:0.25}),Xg={...ig};var Er=In(Mt(),1),ce=In(Gr(),1),og={sm:{borderRadius:32,borderWidth:1,width:70,height:36},md:{borderRadius:16,borderWidth:1},line:{borderRadius:16,borderWidth:1},"pulse-outside":{borderRadius:16,borderWidth:1},"pulse-inner":{borderRadius:16,borderWidth:1}},$c={sm:{dark:{strokeOpacity:0.46,innerOpacity:0.24,bloomOpacity:0.38,innerShadow:"rgba(255, 255, 255, 0.3)",saturation:1.2},light:{strokeOpacity:0.12,innerOpacity:0.3,bloomOpacity:0.16,innerShadow:"rgba(0, 0, 0, 0.14)",saturation:1.8}},md:{dark:{strokeOpacity:0.26,innerOpacity:0.42,bloomOpacity:0.24,innerShadow:"rgba(255, 255, 255, 0.27)",saturation:1.2},light:{strokeOpacity:0.12,innerOpacity:0.26,bloomOpacity:0.34,innerShadow:"rgba(0, 0, 0, 0.14)",saturation:1.5}},line:{dark:{strokeOpacity:1.14,innerOpacity:0.7,bloomOpacity:0.8,innerShadow:"rgba(255, 255, 255, 0.1)",saturation:1.2},light:{strokeOpacity:0.16,innerOpacity:0.32,bloomOpacity:0.3,innerShadow:"rgba(0, 0, 0, 0.14)",saturation:1.95}},"pulse-outside":{dark:{strokeOpacity:0.94,innerOpacity:0.34,bloomOpacity:0.3,innerShadow:"transparent",saturation:1.2,brightness:1.9,hairlineOpacity:0},light:{strokeOpacity:1.96,innerOpacity:1.04,bloomOpacity:0.42,innerShadow:"transparent",saturation:0.6,brightness:1.7,hairlineOpacity:0}},"pulse-inner":{dark:{strokeOpacity:1.54,innerOpacity:0.44,bloomOpacity:0.66,innerShadow:"transparent",saturation:1.2,brightness:0.75},light:{strokeOpacity:0.32,innerOpacity:0.4,bloomOpacity:0.8,innerShadow:"transparent",saturation:0.75,brightness:1.3}}},bg={dark:{...$c.md.dark},light:{...$c.md.light}},Yr={colorful:{border:[{color:"rgb(255, 50, 100)",pos:"33% -7.4%",size:"70px 40px"},{color:"rgb(40, 140, 255)",pos:"12% -5%",size:"60px 35px"},{color:"rgb(50, 200, 80)",pos:"2.1% 68.3%",size:"40px 70px"},{color:"rgb(30, 185, 170)",pos:"2.1% 68.3%",size:"20px 35px"},{color:"rgb(100, 70, 255)",pos:"74.4% 100%",size:"180px 32px"},{color:"rgb(40, 140, 255)",pos:"55% 100%",size:"85px 26px"},{color:"rgb(255, 120, 40)",pos:"93.9% 0%",size:"74px 32px"},{color:"rgb(240, 50, 180)",pos:"100% 27.1%",size:"26px 42px"},{color:"rgb(180, 40, 240)",pos:"100% 27.1%",size:"52px 48px"}],spike:{primary:"rgb(255, 60, 80)",secondary:"rgba(40, 190, 180, 0.98)"},spikeLt:{primary:"rgb(200, 30, 60)",secondary:"rgb(20, 150, 140)"}},mono:{border:[{color:"rgb(180, 180, 180)",pos:"33% -7.4%",size:"70px 40px"},{color:"rgb(140, 140, 140)",pos:"12% -5%",size:"60px 35px"},{color:"rgb(160, 160, 160)",pos:"2.1% 68.3%",size:"40px 70px"},{color:"rgb(130, 130, 130)",pos:"2.1% 68.3%",size:"20px 35px"},{color:"rgb(170, 170, 170)",pos:"74.4% 100%",size:"180px 32px"},{color:"rgb(150, 150, 150)",pos:"55% 100%",size:"85px 26px"},{color:"rgb(190, 190, 190)",pos:"93.9% 0%",size:"74px 32px"},{color:"rgb(145, 145, 145)",pos:"100% 27.1%",size:"26px 42px"},{color:"rgb(165, 165, 165)",pos:"100% 27.1%",size:"52px 48px"}],spike:{primary:"rgb(200, 200, 200)",secondary:"rgb(170, 170, 170)"},spikeLt:{primary:"rgb(80, 80, 80)",secondary:"rgb(120, 120, 120)"}},ocean:{border:[{color:"rgb(100, 80, 220)",pos:"33% -7.4%",size:"70px 40px"},{color:"rgb(60, 120, 255)",pos:"12% -5%",size:"60px 35px"},{color:"rgb(80, 100, 200)",pos:"2.1% 68.3%",size:"40px 70px"},{color:"rgb(50, 140, 220)",pos:"2.1% 68.3%",size:"20px 35px"},{color:"rgb(120, 80, 255)",pos:"74.4% 100%",size:"180px 32px"},{color:"rgb(70, 130, 255)",pos:"55% 100%",size:"85px 26px"},{color:"rgb(140, 100, 240)",pos:"93.9% 0%",size:"74px 32px"},{color:"rgb(90, 110, 230)",pos:"100% 27.1%",size:"26px 42px"},{color:"rgb(130, 70, 255)",pos:"100% 27.1%",size:"52px 48px"}],spike:{primary:"rgb(100, 120, 255)",secondary:"rgba(130, 100, 220, 0.98)"},spikeLt:{primary:"rgb(60, 60, 180)",secondary:"rgb(80, 100, 200)"}},sunset:{border:[{color:"rgb(255, 80, 50)",pos:"33% -7.4%",size:"70px 40px"},{color:"rgb(255, 160, 40)",pos:"12% -5%",size:"60px 35px"},{color:"rgb(255, 120, 60)",pos:"2.1% 68.3%",size:"40px 70px"},{color:"rgb(255, 200, 50)",pos:"2.1% 68.3%",size:"20px 35px"},{color:"rgb(255, 100, 80)",pos:"74.4% 100%",size:"180px 32px"},{color:"rgb(255, 180, 60)",pos:"55% 100%",size:"85px 26px"},{color:"rgb(255, 60, 60)",pos:"93.9% 0%",size:"74px 32px"},{color:"rgb(255, 140, 50)",pos:"100% 27.1%",size:"26px 42px"},{color:"rgb(255, 90, 70)",pos:"100% 27.1%",size:"52px 48px"}],spike:{primary:"rgb(255, 140, 80)",secondary:"rgba(255, 100, 60, 0.98)"},spikeLt:{primary:"rgb(200, 80, 40)",secondary:"rgb(220, 120, 30)"}}},lm={colorful:{border:[{color:"rgb(50, 200, 80)",pos:"2% 68%",size:"9px 18px"},{color:"rgb(30, 185, 170)",pos:"2% 68%",size:"4px 8px"},{color:"rgb(255, 120, 40)",pos:"72% -3%",size:"59px 9px"},{color:"rgb(100, 70, 255)",pos:"74% 100%",size:"42px 7px"},{color:"rgb(240, 50, 180)",pos:"100% 27%",size:"10px 17px"},{color:"rgb(180, 40, 240)",pos:"100% 27%",size:"10px 18px"},{color:"rgb(40, 140, 255)",pos:"100% 27%",size:"5px 10px"},{color:"rgb(255, 50, 100)",pos:"100% 27%",size:"11px 12px"}],inner:[{color:"rgba(50, 200, 80, 0.5)",pos:"2% 68%",size:"9px 18px"},{color:"rgba(30, 185, 170, 0.45)",pos:"2% 68%",size:"4px 8px"},{color:"rgba(255, 120, 40, 0.35)",pos:"72% -3%",size:"59px 9px"},{color:"rgba(100, 70, 255, 0.35)",pos:"74% 100%",size:"42px 7px"},{color:"rgba(240, 50, 180, 0.3)",pos:"100% 27%",size:"10px 17px"},{color:"rgba(180, 40, 240, 0.4)",pos:"100% 27%",size:"10px 18px"},{color:"rgba(40, 140, 255, 0.3)",pos:"100% 27%",size:"5px 10px"},{color:"rgba(255, 50, 100, 0.3)",pos:"100% 27%",size:"11px 12px"}]},mono:{border:[{color:"rgb(160, 160, 160)",pos:"2% 68%",size:"9px 18px"},{color:"rgb(140, 140, 140)",pos:"2% 68%",size:"4px 8px"},{color:"rgb(180, 180, 180)",pos:"72% -3%",size:"59px 9px"},{color:"rgb(150, 150, 150)",pos:"74% 100%",size:"42px 7px"},{color:"rgb(170, 170, 170)",pos:"100% 27%",size:"10px 17px"},{color:"rgb(155, 155, 155)",pos:"100% 27%",size:"10px 18px"},{color:"rgb(145, 145, 145)",pos:"100% 27%",size:"5px 10px"},{color:"rgb(165, 165, 165)",pos:"100% 27%",size:"11px 12px"}],inner:[{color:"rgba(160, 160, 160, 0.25)",pos:"2% 68%",size:"9px 18px"},{color:"rgba(140, 140, 140, 0.22)",pos:"2% 68%",size:"4px 8px"},{color:"rgba(180, 180, 180, 0.17)",pos:"72% -3%",size:"59px 9px"},{color:"rgba(150, 150, 150, 0.17)",pos:"74% 100%",size:"42px 7px"},{color:"rgba(170, 170, 170, 0.15)",pos:"100% 27%",size:"10px 17px"},{color:"rgba(155, 155, 155, 0.20)",pos:"100% 27%",size:"10px 18px"},{color:"rgba(145, 145, 145, 0.15)",pos:"100% 27%",size:"5px 10px"},{color:"rgba(165, 165, 165, 0.15)",pos:"100% 27%",size:"11px 12px"}]},ocean:{border:[{color:"rgb(60, 140, 200)",pos:"2% 68%",size:"9px 18px"},{color:"rgb(50, 120, 180)",pos:"2% 68%",size:"4px 8px"},{color:"rgb(100, 80, 220)",pos:"72% -3%",size:"59px 9px"},{color:"rgb(80, 100, 255)",pos:"74% 100%",size:"42px 7px"},{color:"rgb(120, 70, 240)",pos:"100% 27%",size:"10px 17px"},{color:"rgb(90, 80, 220)",pos:"100% 27%",size:"10px 18px"},{color:"rgb(70, 110, 255)",pos:"100% 27%",size:"5px 10px"},{color:"rgb(110, 90, 230)",pos:"100% 27%",size:"11px 12px"}],inner:[{color:"rgba(60, 140, 200, 0.5)",pos:"2% 68%",size:"9px 18px"},{color:"rgba(50, 120, 180, 0.45)",pos:"2% 68%",size:"4px 8px"},{color:"rgba(100, 80, 220, 0.35)",pos:"72% -3%",size:"59px 9px"},{color:"rgba(80, 100, 255, 0.35)",pos:"74% 100%",size:"42px 7px"},{color:"rgba(120, 70, 240, 0.3)",pos:"100% 27%",size:"10px 17px"},{color:"rgba(90, 80, 220, 0.4)",pos:"100% 27%",size:"10px 18px"},{color:"rgba(70, 110, 255, 0.3)",pos:"100% 27%",size:"5px 10px"},{color:"rgba(110, 90, 230, 0.3)",pos:"100% 27%",size:"11px 12px"}]},sunset:{border:[{color:"rgb(255, 180, 50)",pos:"2% 68%",size:"9px 18px"},{color:"rgb(255, 150, 40)",pos:"2% 68%",size:"4px 8px"},{color:"rgb(255, 80, 60)",pos:"72% -3%",size:"59px 9px"},{color:"rgb(255, 100, 80)",pos:"74% 100%",size:"42px 7px"},{color:"rgb(255, 60, 80)",pos:"100% 27%",size:"10px 17px"},{color:"rgb(255, 120, 60)",pos:"100% 27%",size:"10px 18px"},{color:"rgb(255, 200, 50)",pos:"100% 27%",size:"5px 10px"},{color:"rgb(255, 90, 70)",pos:"100% 27%",size:"11px 12px"}],inner:[{color:"rgba(255, 180, 50, 0.5)",pos:"2% 68%",size:"9px 18px"},{color:"rgba(255, 150, 40, 0.45)",pos:"2% 68%",size:"4px 8px"},{color:"rgba(255, 80, 60, 0.35)",pos:"72% -3%",size:"59px 9px"},{color:"rgba(255, 100, 80, 0.35)",pos:"74% 100%",size:"42px 7px"},{color:"rgba(255, 60, 80, 0.3)",pos:"100% 27%",size:"10px 17px"},{color:"rgba(255, 120, 60, 0.4)",pos:"100% 27%",size:"10px 18px"},{color:"rgba(255, 200, 50, 0.3)",pos:"100% 27%",size:"5px 10px"},{color:"rgba(255, 90, 70, 0.3)",pos:"100% 27%",size:"11px 12px"}]}};function sg(e){return lm[e].border.map((n)=>`radial-gradient(ellipse ${n.size} at ${n.pos}, ${n.color}, transparent)`).join(`,
    `)}function cg(e){return lm[e].inner.map((n)=>`radial-gradient(ellipse ${n.size} at ${n.pos}, ${n.color}, transparent)`).join(`,
    `)}function ag(e){return Yr[e].border.map((n)=>`radial-gradient(ellipse ${n.size} at ${n.pos}, ${n.color}, transparent)`).join(`,
    `)}function fg(e){let n=Yr[e],r=e==="mono"?0.225:0.45;return n.border.map((l)=>{let t=l.color.replace("rgb(","rgba(").replace(")",`, ${r})`);return`radial-gradient(ellipse ${l.size.split(" ").map((u)=>{let i=parseInt(u);return`${Math.round(i*0.9)}px`}).join(" ")} at ${l.pos}, ${t}, transparent)`}).join(`,
    `)}function dg(e,n){let r=Yr[e];return n?r.spike:r.spikeLt}var pg={colorful:{dark:[{color:"rgb(255, 50, 100)",sizeW:36,sizeH:36,offsetX:0,offsetY:2},{color:"rgb(40, 180, 220)",sizeW:30,sizeH:32,offsetX:39,offsetY:0},{color:"rgb(50, 200, 80)",sizeW:33,sizeH:28,offsetX:-36,offsetY:2},{color:"rgb(180, 40, 240)",sizeW:29,sizeH:34,offsetX:-54,offsetY:0},{color:"rgb(255, 160, 30)",sizeW:27,sizeH:30,offsetX:51,offsetY:-1},{color:"rgb(100, 70, 255)",sizeW:36,sizeH:24,offsetX:21,offsetY:1},{color:"rgb(40, 140, 255)",sizeW:30,sizeH:22,offsetX:-21,offsetY:0},{color:"rgb(240, 50, 180)",sizeW:25,sizeH:28,offsetX:66,offsetY:1},{color:"rgb(30, 185, 170)",sizeW:23,sizeH:30,offsetX:-66,offsetY:-1}],light:[{color:"rgb(255, 50, 100)",sizeW:45,sizeH:36,offsetX:0,offsetY:2},{color:"rgb(40, 140, 255)",sizeW:35,sizeH:32,offsetX:65,offsetY:0},{color:"rgb(50, 200, 80)",sizeW:40,sizeH:28,offsetX:-60,offsetY:2},{color:"rgb(180, 40, 240)",sizeW:35,sizeH:34,offsetX:-90,offsetY:0},{color:"rgb(30, 185, 170)",sizeW:38,sizeH:30,offsetX:85,offsetY:-1},{color:"rgb(100, 70, 255)",sizeW:50,sizeH:24,offsetX:35,offsetY:1},{color:"rgb(40, 140, 255)",sizeW:40,sizeH:22,offsetX:-35,offsetY:0},{color:"rgb(255, 120, 40)",sizeW:35,sizeH:28,offsetX:110,offsetY:1},{color:"rgb(240, 50, 180)",sizeW:30,sizeH:30,offsetX:-110,offsetY:-1}]},mono:{dark:[{color:"rgb(200, 200, 200)",sizeW:36,sizeH:36,offsetX:0,offsetY:2},{color:"rgb(170, 170, 170)",sizeW:30,sizeH:32,offsetX:39,offsetY:0},{color:"rgb(155, 155, 155)",sizeW:33,sizeH:28,offsetX:-36,offsetY:2},{color:"rgb(185, 185, 185)",sizeW:29,sizeH:34,offsetX:-54,offsetY:0},{color:"rgb(165, 165, 165)",sizeW:27,sizeH:30,offsetX:51,offsetY:-1},{color:"rgb(180, 180, 180)",sizeW:36,sizeH:24,offsetX:21,offsetY:1},{color:"rgb(160, 160, 160)",sizeW:30,sizeH:22,offsetX:-21,offsetY:0},{color:"rgb(175, 175, 175)",sizeW:25,sizeH:28,offsetX:66,offsetY:1},{color:"rgb(190, 190, 190)",sizeW:23,sizeH:30,offsetX:-66,offsetY:-1}],light:[{color:"rgb(100, 100, 100)",sizeW:45,sizeH:36,offsetX:0,offsetY:2},{color:"rgb(80, 80, 80)",sizeW:35,sizeH:32,offsetX:65,offsetY:0},{color:"rgb(90, 90, 90)",sizeW:40,sizeH:28,offsetX:-60,offsetY:2},{color:"rgb(70, 70, 70)",sizeW:35,sizeH:34,offsetX:-90,offsetY:0},{color:"rgb(85, 85, 85)",sizeW:38,sizeH:30,offsetX:85,offsetY:-1},{color:"rgb(95, 95, 95)",sizeW:50,sizeH:24,offsetX:35,offsetY:1},{color:"rgb(75, 75, 75)",sizeW:40,sizeH:22,offsetX:-35,offsetY:0},{color:"rgb(105, 105, 105)",sizeW:35,sizeH:28,offsetX:110,offsetY:1},{color:"rgb(65, 65, 65)",sizeW:30,sizeH:30,offsetX:-110,offsetY:-1}]},ocean:{dark:[{color:"rgb(100, 80, 220)",sizeW:36,sizeH:36,offsetX:0,offsetY:2},{color:"rgb(60, 120, 255)",sizeW:30,sizeH:32,offsetX:39,offsetY:0},{color:"rgb(80, 100, 200)",sizeW:33,sizeH:28,offsetX:-36,offsetY:2},{color:"rgb(130, 70, 255)",sizeW:29,sizeH:34,offsetX:-54,offsetY:0},{color:"rgb(70, 130, 255)",sizeW:27,sizeH:30,offsetX:51,offsetY:-1},{color:"rgb(120, 80, 255)",sizeW:36,sizeH:24,offsetX:21,offsetY:1},{color:"rgb(90, 110, 230)",sizeW:30,sizeH:22,offsetX:-21,offsetY:0},{color:"rgb(110, 90, 240)",sizeW:25,sizeH:28,offsetX:66,offsetY:1},{color:"rgb(140, 100, 255)",sizeW:23,sizeH:30,offsetX:-66,offsetY:-1}],light:[{color:"rgb(80, 60, 200)",sizeW:45,sizeH:36,offsetX:0,offsetY:2},{color:"rgb(50, 100, 220)",sizeW:35,sizeH:32,offsetX:65,offsetY:0},{color:"rgb(70, 90, 190)",sizeW:40,sizeH:28,offsetX:-60,offsetY:2},{color:"rgb(110, 60, 220)",sizeW:35,sizeH:34,offsetX:-90,offsetY:0},{color:"rgb(60, 110, 230)",sizeW:38,sizeH:30,offsetX:85,offsetY:-1},{color:"rgb(100, 70, 240)",sizeW:50,sizeH:24,offsetX:35,offsetY:1},{color:"rgb(80, 100, 210)",sizeW:40,sizeH:22,offsetX:-35,offsetY:0},{color:"rgb(90, 80, 225)",sizeW:35,sizeH:28,offsetX:110,offsetY:1},{color:"rgb(120, 90, 245)",sizeW:30,sizeH:30,offsetX:-110,offsetY:-1}]},sunset:{dark:[{color:"rgb(255, 100, 60)",sizeW:36,sizeH:36,offsetX:0,offsetY:2},{color:"rgb(255, 180, 50)",sizeW:30,sizeH:32,offsetX:39,offsetY:0},{color:"rgb(255, 140, 70)",sizeW:33,sizeH:28,offsetX:-36,offsetY:2},{color:"rgb(255, 80, 80)",sizeW:29,sizeH:34,offsetX:-54,offsetY:0},{color:"rgb(255, 200, 60)",sizeW:27,sizeH:30,offsetX:51,offsetY:-1},{color:"rgb(255, 120, 50)",sizeW:36,sizeH:24,offsetX:21,offsetY:1},{color:"rgb(255, 160, 80)",sizeW:30,sizeH:22,offsetX:-21,offsetY:0},{color:"rgb(255, 90, 60)",sizeW:25,sizeH:28,offsetX:66,offsetY:1},{color:"rgb(255, 70, 70)",sizeW:23,sizeH:30,offsetX:-66,offsetY:-1}],light:[{color:"rgb(220, 80, 40)",sizeW:45,sizeH:36,offsetX:0,offsetY:2},{color:"rgb(230, 150, 30)",sizeW:35,sizeH:32,offsetX:65,offsetY:0},{color:"rgb(210, 110, 50)",sizeW:40,sizeH:28,offsetX:-60,offsetY:2},{color:"rgb(200, 60, 60)",sizeW:35,sizeH:34,offsetX:-90,offsetY:0},{color:"rgb(220, 170, 40)",sizeW:38,sizeH:30,offsetX:85,offsetY:-1},{color:"rgb(210, 100, 30)",sizeW:50,sizeH:24,offsetX:35,offsetY:1},{color:"rgb(230, 130, 60)",sizeW:40,sizeH:22,offsetX:-35,offsetY:0},{color:"rgb(190, 70, 50)",sizeW:35,sizeH:28,offsetX:110,offsetY:1},{color:"rgb(180, 50, 50)",sizeW:30,sizeH:30,offsetX:-110,offsetY:-1}]}};function mg(e,n,r){return pg[e][n?"dark":"light"].map((l)=>{let t=l.offsetX===0?"":l.offsetX>0?` + ${l.offsetX}px`:` - ${Math.abs(l.offsetX)}px`,u=l.offsetY===0?"":l.offsetY>0?` + ${l.offsetY}px`:` - ${Math.abs(l.offsetY)}px`;return`radial-gradient(ellipse calc(${l.sizeW}px * var(--beam-w-${r})) calc(${l.sizeH}px * var(--beam-h-${r})) at calc(var(--beam-x-${r}) * 100%${t}) calc(100%${u}), ${l.color}, transparent)`}).join(`,
       `)}var vg={colorful:[{color:"rgba(255, 50, 100, 0.48)",sizeW:33,sizeH:30,offsetX:0,offsetY:0},{color:"rgba(40, 180, 220, 0.42)",sizeW:24,sizeH:26,offsetX:39,offsetY:-3},{color:"rgba(50, 200, 80, 0.48)",sizeW:27,sizeH:24,offsetX:-36,offsetY:0},{color:"rgba(180, 40, 240, 0.42)",sizeW:23,sizeH:28,offsetX:-54,offsetY:-2},{color:"rgba(255, 160, 30, 0.50)",sizeW:24,sizeH:24,offsetX:51,offsetY:-1},{color:"rgba(100, 70, 255, 0.45)",sizeW:30,sizeH:20,offsetX:21,offsetY:0},{color:"rgba(40, 140, 255, 0.40)",sizeW:25,sizeH:18,offsetX:-21,offsetY:-2},{color:"rgba(240, 50, 180, 0.45)",sizeW:21,sizeH:24,offsetX:66,offsetY:0},{color:"rgba(30, 185, 170, 0.52)",sizeW:18,sizeH:26,offsetX:-66,offsetY:-1}],mono:[{color:"rgba(200, 200, 200, 0.48)",sizeW:33,sizeH:30,offsetX:0,offsetY:0},{color:"rgba(170, 170, 170, 0.42)",sizeW:24,sizeH:26,offsetX:39,offsetY:-3},{color:"rgba(155, 155, 155, 0.48)",sizeW:27,sizeH:24,offsetX:-36,offsetY:0},{color:"rgba(185, 185, 185, 0.42)",sizeW:23,sizeH:28,offsetX:-54,offsetY:-2},{color:"rgba(165, 165, 165, 0.50)",sizeW:24,sizeH:24,offsetX:51,offsetY:-1},{color:"rgba(180, 180, 180, 0.45)",sizeW:30,sizeH:20,offsetX:21,offsetY:0},{color:"rgba(160, 160, 160, 0.40)",sizeW:25,sizeH:18,offsetX:-21,offsetY:-2},{color:"rgba(175, 175, 175, 0.45)",sizeW:21,sizeH:24,offsetX:66,offsetY:0},{color:"rgba(190, 190, 190, 0.52)",sizeW:18,sizeH:26,offsetX:-66,offsetY:-1}],ocean:[{color:"rgba(100, 80, 220, 0.48)",sizeW:33,sizeH:30,offsetX:0,offsetY:0},{color:"rgba(60, 120, 255, 0.42)",sizeW:24,sizeH:26,offsetX:39,offsetY:-3},{color:"rgba(80, 100, 200, 0.48)",sizeW:27,sizeH:24,offsetX:-36,offsetY:0},{color:"rgba(130, 70, 255, 0.42)",sizeW:23,sizeH:28,offsetX:-54,offsetY:-2},{color:"rgba(70, 130, 255, 0.50)",sizeW:24,sizeH:24,offsetX:51,offsetY:-1},{color:"rgba(120, 80, 255, 0.45)",sizeW:30,sizeH:20,offsetX:21,offsetY:0},{color:"rgba(90, 110, 230, 0.40)",sizeW:25,sizeH:18,offsetX:-21,offsetY:-2},{color:"rgba(110, 90, 240, 0.45)",sizeW:21,sizeH:24,offsetX:66,offsetY:0},{color:"rgba(140, 100, 255, 0.52)",sizeW:18,sizeH:26,offsetX:-66,offsetY:-1}],sunset:[{color:"rgba(255, 100, 60, 0.48)",sizeW:33,sizeH:30,offsetX:0,offsetY:0},{color:"rgba(255, 180, 50, 0.42)",sizeW:24,sizeH:26,offsetX:39,offsetY:-3},{color:"rgba(255, 140, 70, 0.48)",sizeW:27,sizeH:24,offsetX:-36,offsetY:0},{color:"rgba(255, 80, 80, 0.42)",sizeW:23,sizeH:28,offsetX:-54,offsetY:-2},{color:"rgba(255, 200, 60, 0.50)",sizeW:24,sizeH:24,offsetX:51,offsetY:-1},{color:"rgba(255, 120, 50, 0.45)",sizeW:30,sizeH:20,offsetX:21,offsetY:0},{color:"rgba(255, 160, 80, 0.40)",sizeW:25,sizeH:18,offsetX:-21,offsetY:-2},{color:"rgba(255, 90, 60, 0.45)",sizeW:21,sizeH:24,offsetX:66,offsetY:0},{color:"rgba(255, 70, 70, 0.52)",sizeW:18,sizeH:26,offsetX:-66,offsetY:-1}]};function hg(e,n){return vg[e].map((r)=>{let l=r.offsetX===0?"":r.offsetX>0?` + ${r.offsetX}px`:` - ${Math.abs(r.offsetX)}px`,t=r.offsetY===0?"":` - ${Math.abs(r.offsetY)}px`;return`radial-gradient(ellipse calc(${r.sizeW}px * var(--beam-w-${n})) calc(${r.sizeH}px * var(--beam-h-${n})) at calc(var(--beam-x-${n}) * 100%${l}) calc(100%${t}), ${r.color}, transparent)`}).join(`,
    `)}var yg={colorful:{dark:{spikes:[{color1:"rgb(100, 70, 255)",color2:"rgba(100, 70, 255, 1)"},{color1:"rgba(255, 170, 40, 0.59)",color2:"rgba(255, 170, 40, 0.29)"},{color1:"rgb(50, 200, 100)",color2:"rgba(50, 200, 100, 1)"},{color1:"rgba(200, 50, 240, 0.91)",color2:"rgba(200, 50, 240, 0.45)"},{color1:"rgb(40, 140, 255)",color2:"rgba(40, 140, 255, 1)"}]},light:{spikes:[{color1:"rgb(80, 50, 200)",color2:"rgba(80, 50, 200, 0.8)"},{color1:"rgba(210, 130, 0, 0.7)",color2:"rgba(210, 130, 0, 0.46)"},{color1:"rgb(30, 160, 70)",color2:"rgba(30, 160, 70, 0.82)"},{color1:"rgb(160, 30, 190)",color2:"rgba(160, 30, 190, 0.7)"},{color1:"rgb(30, 100, 200)",color2:"rgba(30, 100, 200, 0.78)"}]}},mono:{dark:{spikes:[{color1:"rgb(200, 200, 200)",color2:"rgba(200, 200, 200, 1)"},{color1:"rgba(180, 180, 180, 0.59)",color2:"rgba(180, 180, 180, 0.29)"},{color1:"rgb(190, 190, 190)",color2:"rgba(190, 190, 190, 1)"},{color1:"rgba(170, 170, 170, 0.91)",color2:"rgba(170, 170, 170, 0.45)"},{color1:"rgb(185, 185, 185)",color2:"rgba(185, 185, 185, 1)"}]},light:{spikes:[{color1:"rgb(80, 80, 80)",color2:"rgba(80, 80, 80, 0.8)"},{color1:"rgba(100, 100, 100, 0.7)",color2:"rgba(100, 100, 100, 0.46)"},{color1:"rgb(70, 70, 70)",color2:"rgba(70, 70, 70, 0.82)"},{color1:"rgb(90, 90, 90)",color2:"rgba(90, 90, 90, 0.7)"},{color1:"rgb(85, 85, 85)",color2:"rgba(85, 85, 85, 0.78)"}]}},ocean:{dark:{spikes:[{color1:"rgb(100, 80, 255)",color2:"rgb(100, 80, 255)"},{color1:"rgba(80, 130, 220, 0.59)",color2:"rgba(80, 130, 220, 0.29)"},{color1:"rgb(60, 100, 255)",color2:"rgb(60, 100, 255)"},{color1:"rgba(90, 120, 200, 0.91)",color2:"rgba(90, 120, 200, 0.45)"},{color1:"rgb(120, 90, 255)",color2:"rgb(120, 90, 255)"}]},light:{spikes:[{color1:"rgb(50, 40, 180)",color2:"rgba(50, 40, 180, 0.8)"},{color1:"rgba(40, 80, 200, 0.7)",color2:"rgba(40, 80, 200, 0.46)"},{color1:"rgb(30, 50, 190)",color2:"rgba(30, 50, 190, 0.82)"},{color1:"rgb(60, 90, 180)",color2:"rgba(60, 90, 180, 0.7)"},{color1:"rgb(70, 60, 200)",color2:"rgba(70, 60, 200, 0.78)"}]}},sunset:{dark:{spikes:[{color1:"rgb(255, 100, 80)",color2:"rgb(255, 100, 80)"},{color1:"rgba(255, 150, 80, 0.59)",color2:"rgba(255, 150, 80, 0.29)"},{color1:"rgb(255, 80, 60)",color2:"rgb(255, 80, 60)"},{color1:"rgba(255, 120, 50, 0.91)",color2:"rgba(255, 120, 50, 0.45)"},{color1:"rgb(255, 140, 70)",color2:"rgb(255, 140, 70)"}]},light:{spikes:[{color1:"rgb(200, 60, 30)",color2:"rgba(200, 60, 30, 0.8)"},{color1:"rgba(220, 100, 20, 0.7)",color2:"rgba(220, 100, 20, 0.46)"},{color1:"rgb(180, 40, 20)",color2:"rgba(180, 40, 20, 0.82)"},{color1:"rgb(210, 80, 10)",color2:"rgba(210, 80, 10, 0.7)"},{color1:"rgb(190, 70, 30)",color2:"rgba(190, 70, 30, 0.78)"}]}}};function ji(e,n){let r=e.match(/^rgba\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*[\d.]+\s*\)$/);if(r)return`rgba(${r[1]}, ${r[2]}, ${r[3]}, ${n})`;let l=e.match(/^rgb\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*\)$/);return l?`rgba(${l[1]}, ${l[2]}, ${l[3]}, ${n})`:e}function Kr(e,n){let r=e.match(/^rgba\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*\)$/);if(r)return`rgba(${r[1]}, ${r[2]}, ${r[3]}, ${(parseFloat(r[4])*n).toFixed(2)})`;let l=e.match(/^rgb\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*\)$/);return l?`rgba(${l[1]}, ${l[2]}, ${l[3]}, ${n.toFixed(2)})`:e}function gg(e,n,r){let l=dg(e,n),t=yg[e][n?"dark":"light"],u=e==="mono",i=u?0.14:1,o=u?Kr(l.primary,0.14):l.primary,s=u?Kr(l.primary,0.09):l.primary,c=u?Kr(l.secondary,0.12):l.secondary,d=u?ji(l.secondary,0.06):ji(l.secondary,0.49),a=t.spikes.map((T)=>u?{color1:Kr(T.color1,i),color2:Kr(T.color2,i*0.7)}:T),v=u?"12px":"0.8px",h=u?"14px":"2px",g=u?"12px":"1.2px",y=u?"10px":"0.6px",S=u?"42px":"92px",m=u?"38px":"72px",f=u?"40px":"85px",p=u?"32px":"60px",w=u?"12px":"1px",k=u?"rgba(255, 255, 255, 0.5)":"rgba(255, 255, 255, 1)",E=u?"rgba(255, 255, 255, 0.45)":"rgba(255, 255, 255, 0.9)",P=u?"rgba(255, 255, 255, 0.25)":"rgba(255, 255, 255, 0.5)",N=u?"rgba(255, 255, 255, 0.15)":"rgba(255, 255, 255, 0.3)",x=u?"rgba(255, 255, 255, 0.06)":"rgba(255, 255, 255, 0.12)",L=u?"rgba(255, 255, 255, 0.015)":"rgba(255, 255, 255, 0.03)";if(n)return`radial-gradient(ellipse calc(${v} * var(--beam-spike-${r})) calc(${S} * var(--beam-h-${r})) at 8% calc(100% - 2px), ${o}, ${s} 30%, transparent 88%),
       radial-gradient(ellipse calc(10px * var(--beam-spike2-${r})) calc(35px * var(--beam-h-${r})) at 22% calc(100% - 4px), ${c}, ${d} 50%, transparent 95%),
       radial-gradient(ellipse calc(${h} * (2 - var(--beam-spike-${r}))) calc(${m} * var(--beam-h-${r})) at 36% calc(100% - 3px), ${a[0].color1}, ${a[0].color2} 40%, transparent 90%),
       radial-gradient(ellipse calc(14px * var(--beam-spike2-${r})) calc(28px * var(--beam-h-${r})) at 50% calc(100% - 2px), ${a[1].color1}, ${a[1].color2} 55%, transparent 96%),
       radial-gradient(ellipse calc(${g} * (2 - var(--beam-spike2-${r}))) calc(${f} * var(--beam-h-${r})) at 64% calc(100% - 4px), ${a[2].color1}, ${a[2].color2} 35%, transparent 89%),
       radial-gradient(ellipse calc(7px * var(--beam-spike-${r})) calc(45px * var(--beam-h-${r})) at 78% calc(100% - 2px), ${a[3].color1}, ${a[3].color2} 48%, transparent 94%),
       radial-gradient(ellipse calc(${y} * (2 - var(--beam-spike-${r}))) calc(${p} * var(--beam-h-${r})) at 92% calc(100% - 3px), ${a[4].color1}, ${a[4].color2} 42%, transparent 91%),
       radial-gradient(ellipse calc(21px * var(--beam-spike-${r})) calc(15px * var(--beam-spike2-${r})) at calc(var(--beam-x-${r}) * 100%) calc(100% + 1px), ${k} 0%, ${E} 20%, ${P} 50%, transparent 100%),
       radial-gradient(ellipse calc(42px * var(--beam-w-${r})) calc(40px * var(--beam-h-${r})) at calc(var(--beam-x-${r}) * 100%) 100%, ${N} 0%, ${x} 25%, ${L} 55%, transparent 80%)`;{let T=u?Kr(l.primary,0.11):ji(l.primary,0.85),V=u?Kr(l.secondary,0.09):ji(l.secondary,0.7);return`radial-gradient(ellipse calc(${v} * var(--beam-spike-${r})) calc(${S} * var(--beam-h-${r})) at 8% calc(100% - 2px), ${o}, ${T} 30%, transparent 88%),
       radial-gradient(ellipse calc(10px * var(--beam-spike2-${r})) calc(35px * var(--beam-h-${r})) at 22% calc(100% - 4px), ${c}, ${V} 50%, transparent 95%),
       radial-gradient(ellipse calc(${h} * (2 - var(--beam-spike-${r}))) calc(${m} * var(--beam-h-${r})) at 36% calc(100% - 3px), ${a[0].color1}, ${a[0].color2} 40%, transparent 90%),
       radial-gradient(ellipse calc(14px * var(--beam-spike2-${r})) calc(28px * var(--beam-h-${r})) at 50% calc(100% - 2px), ${a[1].color1}, ${a[1].color2} 55%, transparent 96%),
       radial-gradient(ellipse calc(${g} * (2 - var(--beam-spike2-${r}))) calc(${f} * var(--beam-h-${r})) at 64% calc(100% - 4px), ${a[2].color1}, ${a[2].color2} 35%, transparent 89%),
       radial-gradient(ellipse calc(7px * var(--beam-spike-${r})) calc(45px * var(--beam-h-${r})) at 78% calc(100% - 2px), ${a[3].color1}, ${a[3].color2} 48%, transparent 94%),
       radial-gradient(ellipse calc(${w} * (2 - var(--beam-spike-${r}))) calc(${p} * var(--beam-h-${r})) at 92% calc(100% - 3px), ${a[4].color1}, ${a[4].color2} 42%, transparent 91%),
       radial-gradient(ellipse calc(50px * var(--beam-w-${r})) calc(32px * var(--beam-h-${r})) at calc(var(--beam-x-${r}) * 100%) calc(100%), rgba(0, 0, 0, 0.5) 0%, rgba(0, 0, 0, 0.18) 30%, rgba(0, 0, 0, 0.03) 60%, transparent 85%)`}}var tm=[{region:1,quad:"tl"},{region:2,quad:"tl"},{region:3,quad:"bl"},{region:1,quad:"bl"},{region:2,quad:"br"},{region:3,quad:"br"},{region:1,quad:"tr"},{region:2,quad:"tr"},{region:3,quad:"tr"}],wg=[[65,35],[55,30],[35,65],[15,30],[173,28],[80,22],[69,28],[22,38],[47,44]],kg=[{ci:0,region:1,quad:"tl",w:84,h:48},{ci:1,region:2,quad:"tl",w:72,h:42},{ci:2,region:3,quad:"bl",w:48,h:84},{ci:4,region:2,quad:"br",w:216,h:38},{ci:5,region:3,quad:"br",w:102,h:31},{ci:6,region:1,quad:"tr",w:89,h:38},{ci:8,region:3,quad:"tr",w:62,h:58}],em=[{ci:0,region:1,quad:"tl",w:80,h:19,x:"27%",y:"0%"},{ci:6,region:2,quad:"tr",w:74,h:11,x:"73%",y:"-1%"},{ci:7,region:3,quad:"tr",w:15,h:44,x:"100%",y:"33%"},{ci:8,region:1,quad:"br",w:19,h:38,x:"101%",y:"72%"},{ci:4,region:2,quad:"br",w:84,h:13,x:"67%",y:"100%"},{ci:1,region:3,quad:"bl",w:60,h:21,x:"24%",y:"101%"},{ci:2,region:1,quad:"bl",w:17,h:40,x:"0%",y:"60%"},{ci:3,region:2,quad:"tl",w:13,h:32,x:"-1%",y:"28%"}],Sg=[{ci:0,region:1,quad:"tl",w:110,h:30,x:"27%",y:"3%"},{ci:6,region:2,quad:"tr",w:100,h:20,x:"73%",y:"1%"},{ci:7,region:3,quad:"tr",w:26,h:62,x:"100%",y:"33%"},{ci:8,region:1,quad:"br",w:30,h:56,x:"101%",y:"72%"},{ci:4,region:2,quad:"br",w:120,h:22,x:"67%",y:"99%"},{ci:1,region:3,quad:"bl",w:88,h:32,x:"24%",y:"99%"},{ci:2,region:1,quad:"bl",w:28,h:58,x:"0%",y:"60%"}];function Eg(e,n,r){let l=e.match(/^rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/);return`rgba(${l?`${l[1]}, ${l[2]}, ${l[3]}`:"255, 255, 255"}, var(--bop-${n}-${r}))`}function Kc(e,n,r,l,t,u,i,o){return`radial-gradient(ellipse calc(${n}px * var(--bw${l}-${o}) * var(--pulse-glow-sx, 1) * var(--pulse-glow-boost, 1)) calc(${r}px * var(--bh${l}-${o}) * var(--bgh-${o}) * var(--pulse-glow-sy, 1) * var(--pulse-glow-boost, 1)) at calc(${u} + var(--bx${l}-${o})) calc(${i} + var(--by${l}-${o})), ${Eg(e,t,o)}, transparent)`}function Cg(e,n){return Yr[e].border.map((r,l)=>{let{region:t,quad:u}=tm[l],[i,o]=r.pos.split(" "),[s,c]=r.size.split(" ").map(parseFloat);return Kc(r.color,s,c,t,u,i,o,n)}).join(`,
    `)}function Ng(e,n,r){let l=Yr[e].border.map((o,s)=>{let{region:c,quad:d}=tm[s],[a,v]=o.pos.split(" "),[h,g]=wg[s];return Kc(o.color,h,g,c,d,a,v,n)}),t=r?"255, 255, 255":"0, 0, 0",u=r?0.18:0.08,i=[["0%","0%","tl"],["100%","0%","tr"],["0%","100%","bl"],["100%","100%","br"]].map(([o,s,c])=>`radial-gradient(ellipse 60px 60px at ${o} ${s}, rgba(${t}, calc(${u} * var(--bop-${c}-${n}))), transparent 70%)`);return[...l,...i].join(`,
    `)}function nm(e,n,r){let l=Yr[n].border;return e.map((t)=>{let u=l[t.ci],[i,o]=u.pos.split(" ");return Kc(u.color,t.w,t.h,t.region,t.quad,t.x??i,t.y??o,r)}).join(`,
    `)}function um(e,n,r){let l=Yr[n].border,t=+r.toFixed(3);return e.map((u)=>{let i=l[u.ci],[o,s]=i.pos.split(" "),c=u.x??o,d=u.y??s,a=i.color.match(/^rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/),v=a?`${a[1]}, ${a[2]}, ${a[3]}`:"255, 255, 255";return`radial-gradient(ellipse calc(${u.w}px * var(--pulse-glow-sx, 1) * var(--pulse-glow-boost, 1)) calc(${u.h}px * var(--pulse-glow-sy, 1) * var(--pulse-glow-boost, 1)) at ${c} ${d}, rgba(${v}, ${t}), transparent)`}).join(`,
    `)}function Xt(e){return`
[data-beam="${e}"][data-paused],
[data-beam="${e}"][data-paused]::after,
[data-beam="${e}"][data-paused]::before,
[data-beam="${e}"][data-paused] [data-beam-bloom] {
  animation-play-state: paused !important;
}`}function im(e){let n=["bw1","bh1","bw2","bh2","bw3","bh3","bgh","bop-tl","bop-tr","bop-bl","bop-br"],r=["bx1","by1","bx2","by2","bx3","by3"],l=n.map((u)=>`@property --${u}-${e} {
  syntax: "<number>";
  initial-value: 1;
  inherits: true;
}`).join(`

`),t=r.map((u)=>`@property --${u}-${e} {
  syntax: "<length>";
  initial-value: 0px;
  inherits: true;
}`).join(`

`);return`${l}

${t}

@property --beam-opacity-${e} {
  syntax: "<number>";
  initial-value: 0;
  inherits: true;
}

@property --beam-hue-${e} {
  syntax: "<angle>";
  initial-value: 0deg;
  inherits: true;
}`}function Yc(e,n,r){let l=n==="dark",t=r/2.3;return e==="pulse-inner"?{sp:0.28,dr:l?33:40,op:l?0.48:0.45,gh:l?0.34:0.22,bs:(l?1.9:2.6)*t,ss:(l?2.6:4.6)*t,ghs:(l?2.4:5.5)*t,huePeriod:16}:{sp:l?0.28:0.36,dr:l?14:19,op:l?0.46:0,gh:l?0.16:0.58,bs:(l?2.3:3.7)*t,ss:(l?6.4:4.6)*t,ghs:(l?2.4:3.8)*t,huePeriod:14}}function Pg(e,n){let{sp:r,dr:l,op:t,gh:u,bs:i,ss:o,ghs:s}=n;return[{prop:`--bw1-${e}`,a:1-r,b:1+r*1.1,period:o*0.9,delay:0,unit:""},{prop:`--bh1-${e}`,a:1+r*0.9,b:1-r*0.85,period:o*1.26,delay:0,unit:""},{prop:`--bx1-${e}`,a:-l,b:l*0.9,period:i*1.6,delay:0,unit:"px"},{prop:`--by1-${e}`,a:l*0.55,b:-l*0.7,period:i*1.6,delay:0,unit:"px"},{prop:`--bw2-${e}`,a:1+r,b:1-r*0.85,period:o*1.1,delay:0,unit:""},{prop:`--bh2-${e}`,a:1-r*0.8,b:1+r*1.05,period:o*0.81,delay:0,unit:""},{prop:`--bx2-${e}`,a:l*0.8,b:-l*0.9,period:i*1.88,delay:0,unit:"px"},{prop:`--by2-${e}`,a:-l,b:l*0.65,period:i*1.88,delay:0,unit:"px"},{prop:`--bw3-${e}`,a:1-r*0.6,b:1+r*1.15,period:o*0.98,delay:0,unit:""},{prop:`--bh3-${e}`,a:1+r*0.75,b:1-r,period:o*1.4,delay:0,unit:""},{prop:`--bx3-${e}`,a:-l*0.6,b:l,period:i*1.45,delay:0,unit:"px"},{prop:`--by3-${e}`,a:-l*0.85,b:l*0.45,period:i*1.45,delay:0,unit:"px"},{prop:`--bgh-${e}`,a:1-u,b:1+u,period:s,delay:0,unit:""},{prop:`--bop-tl-${e}`,a:1-t,b:1,period:i,delay:0,unit:""},{prop:`--bop-tr-${e}`,a:1-t,b:1,period:i*1.32,delay:i*0.28,unit:""},{prop:`--bop-bl-${e}`,a:1-t,b:1,period:i*0.84,delay:i*0.55,unit:""},{prop:`--bop-br-${e}`,a:1-t,b:1,period:i*1.58,delay:i*0.83,unit:""}]}function _g(e,n,r,l,t,u){if(e!=="pulse-inner"&&e!=="pulse-outside")return null;let i=Yc(e,n,r);return{oscillators:Pg(u,i),hue:t?null:{prop:`--beam-hue-${u}`,range:360,period:i.huePeriod,continuous:!0}}}function Vi(e,n,r){return`  animation: ${n}-${e} ${r}s ease forwards;`}function zg(e){let{size:n}=e;return n==="line"?Ig(e):n==="sm"?Lg(e):n==="pulse-inner"?Tg(e):n==="pulse-outside"?Dg(e):xg(e)}function Lg(e){let{id:n,borderRadius:r,borderWidth:l,duration:t,strokeOpacity:u,innerOpacity:i,bloomOpacity:o,innerShadow:s,colorVariant:c,staticColors:d,brightness:a,saturation:v,hueRange:h,theme:g}=e,y=Math.max(0,r-l),S=c==="mono"?0.5:1,m=u*S,f=i*S,p=o*S,w=d?"":`animation: beam-hue-shift-${n} 12s ease-in-out infinite;`,k=d?"":`
@keyframes beam-hue-shift-${n} {
  0% { filter: hue-rotate(calc(var(--beam-hue-base, 0deg) - ${h}deg)) brightness(${a.toFixed(2)}) saturate(${v.toFixed(2)}); }
  50% { filter: hue-rotate(calc(var(--beam-hue-base, 0deg) + ${h}deg)) brightness(${a.toFixed(2)}) saturate(${v.toFixed(2)}); }
  100% { filter: hue-rotate(calc(var(--beam-hue-base, 0deg) - ${h}deg)) brightness(${a.toFixed(2)}) saturate(${v.toFixed(2)}); }
}`,E=g==="dark",P=E?`conic-gradient(
        from var(--beam-angle-${n}),
        transparent 0%, transparent 54%,
        rgba(255, 255, 255, 0.1) 57%,
        rgba(255, 255, 255, 0.3) 60%,
        rgba(255, 255, 255, 0.6) 63%,
        rgba(255, 255, 255, 0.75) 66%,
        rgba(255, 255, 255, 0.6) 69%,
        rgba(255, 255, 255, 0.3) 72%,
        rgba(255, 255, 255, 0.1) 75%,
        transparent 78%, transparent 100%
      )`:`conic-gradient(
        from var(--beam-angle-${n}),
        transparent 0%, transparent 54%,
        rgba(0, 0, 0, 0.08) 57%,
        rgba(0, 0, 0, 0.2) 60%,
        rgba(0, 0, 0, 0.4) 63%,
        rgba(0, 0, 0, 0.55) 66%,
        rgba(0, 0, 0, 0.4) 69%,
        rgba(0, 0, 0, 0.2) 72%,
        rgba(0, 0, 0, 0.08) 75%,
        transparent 78%, transparent 100%
      )`,N=sg(c),x=cg(c),L=E?`conic-gradient(
        from var(--beam-angle-${n}),
        transparent 0%, transparent 58%,
        rgba(255, 255, 255, 0.03) 62%,
        rgba(255, 255, 255, 0.08) 65%,
        rgba(255, 255, 255, 0.2) 67%,
        rgba(255, 255, 255, 0.45) 69%,
        rgba(255, 255, 255, 0.85) 70%,
        rgba(255, 255, 255, 0.85) 70.5%,
        rgba(255, 255, 255, 0.45) 71.5%,
        rgba(255, 255, 255, 0.2) 73%,
        rgba(255, 255, 255, 0.08) 75%,
        rgba(255, 255, 255, 0.03) 78%,
        transparent 82%
      )`:`conic-gradient(
        from var(--beam-angle-${n}),
        transparent 0%, transparent 58%,
        rgba(0, 0, 0, 0.02) 62%,
        rgba(0, 0, 0, 0.08) 65%,
        rgba(0, 0, 0, 0.2) 67%,
        rgba(0, 0, 0, 0.4) 69%,
        rgba(0, 0, 0, 0.6) 70%,
        rgba(0, 0, 0, 0.6) 70.5%,
        rgba(0, 0, 0, 0.4) 71.5%,
        rgba(0, 0, 0, 0.2) 73%,
        rgba(0, 0, 0, 0.08) 75%,
        rgba(0, 0, 0, 0.02) 78%,
        transparent 82%
      )`,T=`conic-gradient(
    from var(--beam-angle-${n}),
    transparent 0%, transparent 22%,
    rgba(255, 255, 255, 0.12) 28%, rgba(255, 255, 255, 0.4) 36%,
    white 46%, white 82%,
    rgba(255, 255, 255, 0.4) 88%, rgba(255, 255, 255, 0.12) 94%,
    transparent 97%, transparent 100%
  )`;return`
@property --beam-angle-${n} {
  syntax: "<angle>";
  initial-value: 0deg;
  inherits: true;
}

@property --beam-opacity-${n} {
  syntax: "<number>";
  initial-value: 0;
  inherits: true;
}

[data-beam="${n}"] {
  position: relative;
  border-radius: ${r}px;
  overflow: hidden;
}

[data-beam="${n}"][data-active] {
  animation:
    beam-spin-${n} ${t}s linear infinite,
    beam-fade-in-${n} 0.6s ease forwards;
}

[data-beam="${n}"][data-fading] {
  animation:
    beam-spin-${n} ${t}s linear infinite,
    beam-fade-out-${n} 0.5s ease forwards;
}

[data-beam="${n}"][data-active]::after,
[data-beam="${n}"][data-fading]::after {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: ${y}px;
  padding: ${l}px;
  clip-path: inset(0 round ${r}px);
  background: ${P},${N};
  -webkit-mask:
    conic-gradient(
      from var(--beam-angle-${n}),
      transparent 0%, transparent 30%,
      rgba(255, 255, 255, 0.1) 36%, rgba(255, 255, 255, 0.35) 44%,
      white 52%, white 80%,
      rgba(255, 255, 255, 0.35) 86%, rgba(255, 255, 255, 0.1) 92%,
      transparent 95%, transparent 100%
    ),
    linear-gradient(#fff 0 0) content-box,
    linear-gradient(#fff 0 0);
  -webkit-mask-composite: source-in, xor;
  mask:
    conic-gradient(
      from var(--beam-angle-${n}),
      transparent 0%, transparent 30%,
      rgba(255, 255, 255, 0.1) 36%, rgba(255, 255, 255, 0.35) 44%,
      white 52%, white 80%,
      rgba(255, 255, 255, 0.35) 86%, rgba(255, 255, 255, 0.1) 92%,
      transparent 95%, transparent 100%
    ),
    linear-gradient(#fff 0 0) content-box,
    linear-gradient(#fff 0 0);
  mask-composite: intersect, exclude;
  pointer-events: none;
  z-index: 2;
  opacity: calc(var(--beam-opacity-${n}) * ${m.toFixed(2)} * var(--beam-stroke-opacity, 1) * var(--beam-strength, 1));
  ${w}
}

[data-beam="${n}"][data-active]::before,
[data-beam="${n}"][data-fading]::before {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: ${r}px;
  clip-path: inset(0 round ${r}px);
  background: ${x};
  box-shadow: inset 0 0 5px 1px ${s};
  -webkit-mask-image: ${T};
  -webkit-mask-composite: source-over;
  mask-image: ${T};
  mask-composite: add;
  pointer-events: none;
  z-index: 1;
  opacity: calc(var(--beam-opacity-${n}) * ${f.toFixed(2)} * var(--beam-inner-opacity, 1) * var(--beam-strength, 1));
  ${w}
}

[data-beam="${n}"] [data-beam-bloom] {
  display: none;
  position: absolute;
  inset: 0;
  border-radius: ${y}px;
  clip-path: inset(0 round ${r}px);
  background: ${L};
  -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  mask-composite: exclude;
  padding: ${l}px;
  filter: blur(8px) brightness(${a.toFixed(2)}) saturate(${v.toFixed(2)});
  pointer-events: none;
  z-index: 3;
  opacity: 0;
}

[data-beam="${n}"][data-active] [data-beam-bloom],
[data-beam="${n}"][data-fading] [data-beam-bloom] {
  display: block;
  opacity: calc(var(--beam-opacity-${n}) * ${p.toFixed(2)} * var(--beam-bloom-opacity, 1) * var(--beam-strength, 1));
}

@keyframes beam-spin-${n} {
  to { --beam-angle-${n}: 360deg; }
}

@keyframes beam-fade-in-${n} {
  to { --beam-opacity-${n}: 1; }
}

@keyframes beam-fade-out-${n} {
  from { --beam-opacity-${n}: 1; }
  to { --beam-opacity-${n}: 0; }
}
${k}
${Xt(n)}
`}function xg(e){let{id:n,borderRadius:r,borderWidth:l,duration:t,strokeOpacity:u,innerOpacity:i,bloomOpacity:o,innerShadow:s,colorVariant:c,staticColors:d,brightness:a,saturation:v,hueRange:h,theme:g}=e,y=Math.max(0,r-l),S=c==="mono"?0.5:1,m=u*S,f=i*S,p=o*S,w=d?"":`animation: beam-hue-shift-${n} 12s ease-in-out infinite;`,k=d?"":`
@keyframes beam-hue-shift-${n} {
  0% { filter: hue-rotate(calc(var(--beam-hue-base, 0deg) - ${h}deg)) brightness(${a.toFixed(2)}) saturate(${v.toFixed(2)}); }
  50% { filter: hue-rotate(calc(var(--beam-hue-base, 0deg) + ${h}deg)) brightness(${a.toFixed(2)}) saturate(${v.toFixed(2)}); }
  100% { filter: hue-rotate(calc(var(--beam-hue-base, 0deg) - ${h}deg)) brightness(${a.toFixed(2)}) saturate(${v.toFixed(2)}); }
}`,E=g==="dark",P=E?`conic-gradient(
        from var(--beam-angle-${n}),
        transparent 0%, transparent 54%,
        rgba(255, 255, 255, 0.1) 57%,
        rgba(255, 255, 255, 0.3) 60%,
        rgba(255, 255, 255, 0.6) 63%,
        rgba(255, 255, 255, 0.75) 66%,
        rgba(255, 255, 255, 0.6) 69%,
        rgba(255, 255, 255, 0.3) 72%,
        rgba(255, 255, 255, 0.1) 75%,
        transparent 78%, transparent 100%
      )`:`conic-gradient(
        from var(--beam-angle-${n}),
        transparent 0%, transparent 54%,
        rgba(0, 0, 0, 0.08) 57%,
        rgba(0, 0, 0, 0.2) 60%,
        rgba(0, 0, 0, 0.4) 63%,
        rgba(0, 0, 0, 0.55) 66%,
        rgba(0, 0, 0, 0.4) 69%,
        rgba(0, 0, 0, 0.2) 72%,
        rgba(0, 0, 0, 0.08) 75%,
        transparent 78%, transparent 100%
      )`,N=ag(c),x=fg(c),L=E?`conic-gradient(
        from var(--beam-angle-${n}),
        transparent 0%, transparent 58%,
        rgba(255, 255, 255, 0.03) 62%,
        rgba(255, 255, 255, 0.08) 65%,
        rgba(255, 255, 255, 0.2) 67%,
        rgba(255, 255, 255, 0.45) 69%,
        rgba(255, 255, 255, 0.85) 70%,
        rgba(255, 255, 255, 0.85) 70.5%,
        rgba(255, 255, 255, 0.45) 71.5%,
        rgba(255, 255, 255, 0.2) 73%,
        rgba(255, 255, 255, 0.08) 75%,
        rgba(255, 255, 255, 0.03) 78%,
        transparent 82%
      )`:`conic-gradient(
        from var(--beam-angle-${n}),
        transparent 0%, transparent 58%,
        rgba(0, 0, 0, 0.02) 62%,
        rgba(0, 0, 0, 0.08) 65%,
        rgba(0, 0, 0, 0.2) 67%,
        rgba(0, 0, 0, 0.4) 69%,
        rgba(0, 0, 0, 0.6) 70%,
        rgba(0, 0, 0, 0.6) 70.5%,
        rgba(0, 0, 0, 0.4) 71.5%,
        rgba(0, 0, 0, 0.2) 73%,
        rgba(0, 0, 0, 0.08) 75%,
        rgba(0, 0, 0, 0.02) 78%,
        transparent 82%
      )`;return`
@property --beam-angle-${n} {
  syntax: "<angle>";
  initial-value: 0deg;
  inherits: true;
}

@property --beam-opacity-${n} {
  syntax: "<number>";
  initial-value: 0;
  inherits: true;
}

[data-beam="${n}"] {
  position: relative;
  border-radius: ${r}px;
  overflow: hidden;
}

[data-beam="${n}"][data-active] {
  animation:
    beam-spin-${n} ${t}s linear infinite,
    beam-fade-in-${n} 0.6s ease forwards;
}

[data-beam="${n}"][data-fading] {
  animation:
    beam-spin-${n} ${t}s linear infinite,
    beam-fade-out-${n} 0.5s ease forwards;
}

[data-beam="${n}"][data-active]::after,
[data-beam="${n}"][data-fading]::after {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: ${y}px;
  padding: ${l}px;
  clip-path: inset(0 round ${r}px);
  background: ${P},${N};
  -webkit-mask:
    conic-gradient(
      from var(--beam-angle-${n}),
      transparent 0%, transparent 30%,
      rgba(255, 255, 255, 0.1) 36%, rgba(255, 255, 255, 0.35) 44%,
      white 52%, white 80%,
      rgba(255, 255, 255, 0.35) 86%, rgba(255, 255, 255, 0.1) 92%,
      transparent 95%, transparent 100%
    ),
    linear-gradient(#fff 0 0) content-box,
    linear-gradient(#fff 0 0);
  -webkit-mask-composite: source-in, xor;
  mask:
    conic-gradient(
      from var(--beam-angle-${n}),
      transparent 0%, transparent 30%,
      rgba(255, 255, 255, 0.1) 36%, rgba(255, 255, 255, 0.35) 44%,
      white 52%, white 80%,
      rgba(255, 255, 255, 0.35) 86%, rgba(255, 255, 255, 0.1) 92%,
      transparent 95%, transparent 100%
    ),
    linear-gradient(#fff 0 0) content-box,
    linear-gradient(#fff 0 0);
  mask-composite: intersect, exclude;
  pointer-events: none;
  z-index: 2;
  opacity: calc(var(--beam-opacity-${n}) * ${m.toFixed(2)} * var(--beam-stroke-opacity, 1) * var(--beam-strength, 1));
  ${w}
}

[data-beam="${n}"][data-active]::before,
[data-beam="${n}"][data-fading]::before {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: ${r}px;
  background: ${x};
  box-shadow: inset 0 0 9px 1px ${s};
  -webkit-mask-image:
    conic-gradient(
      from var(--beam-angle-${n}),
      transparent 0%, transparent 30%,
      rgba(255, 255, 255, 0.1) 36%, rgba(255, 255, 255, 0.35) 44%,
      white 52%, white 80%,
      rgba(255, 255, 255, 0.35) 86%, rgba(255, 255, 255, 0.1) 92%,
      transparent 95%, transparent 100%
    ),
    linear-gradient(white, transparent 28px, transparent calc(100% - 28px), white),
    linear-gradient(to right, white, transparent 28px, transparent calc(100% - 28px), white);
  -webkit-mask-composite: source-in, source-over;
  mask-image:
    conic-gradient(
      from var(--beam-angle-${n}),
      transparent 0%, transparent 30%,
      rgba(255, 255, 255, 0.1) 36%, rgba(255, 255, 255, 0.35) 44%,
      white 52%, white 80%,
      rgba(255, 255, 255, 0.35) 86%, rgba(255, 255, 255, 0.1) 92%,
      transparent 95%, transparent 100%
    ),
    linear-gradient(white, transparent 28px, transparent calc(100% - 28px), white),
    linear-gradient(to right, white, transparent 28px, transparent calc(100% - 28px), white);
  mask-composite: intersect, add;
  pointer-events: none;
  z-index: 1;
  opacity: calc(var(--beam-opacity-${n}) * ${f.toFixed(2)} * var(--beam-inner-opacity, 1) * var(--beam-strength, 1));
  clip-path: inset(0 round ${r}px);
  ${w}
}

[data-beam="${n}"] [data-beam-bloom] {
  display: none;
  position: absolute;
  inset: 0;
  border-radius: ${y}px;
  clip-path: inset(0 round ${r}px);
  background: ${L};
  -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  mask-composite: exclude;
  padding: ${l}px;
  filter: blur(8px) brightness(${a.toFixed(2)}) saturate(${v.toFixed(2)});
  pointer-events: none;
  z-index: 3;
  opacity: 0;
}

[data-beam="${n}"][data-active] [data-beam-bloom],
[data-beam="${n}"][data-fading] [data-beam-bloom] {
  display: block;
  opacity: calc(var(--beam-opacity-${n}) * ${p.toFixed(2)} * var(--beam-bloom-opacity, 1) * var(--beam-strength, 1));
}

@keyframes beam-spin-${n} {
  to { --beam-angle-${n}: 360deg; }
}

@keyframes beam-fade-in-${n} {
  to { --beam-opacity-${n}: 1; }
}

@keyframes beam-fade-out-${n} {
  from { --beam-opacity-${n}: 1; }
  to { --beam-opacity-${n}: 0; }
}
${k}
${Xt(n)}
`}function Tg(e){let{id:n,borderRadius:r,borderWidth:l,duration:t,strokeOpacity:u,innerOpacity:i,bloomOpacity:o,colorVariant:s,staticColors:c,brightness:d,saturation:a,hueRange:v,theme:h}=e,g=h==="dark",y=s==="mono"?0.5:1,S=(u*y).toFixed(2),m=(i*y).toFixed(2),f=(o*y).toFixed(2),{op:p}=Yc("pulse-inner",h,t),k=d.toFixed(2),E=a.toFixed(2),P=c?`filter: brightness(${k}) saturate(${E});`:`filter: hue-rotate(calc(var(--beam-hue-base, 0deg) + var(--beam-hue-${n}))) brightness(${k}) saturate(${E});`,N=c?`filter: blur(8px) brightness(${k}) saturate(${E});`:`filter: blur(8px) hue-rotate(calc(var(--beam-hue-base, 0deg) + var(--beam-hue-${n}))) brightness(${k}) saturate(${E});`,x=Cg(s,n),L=Ng(s,n,g),T=um(kg,s,1-p*0.5);return`
${im(n)}

[data-beam="${n}"] {
  position: relative;
  border-radius: ${r}px;
  overflow: hidden;
  isolation: isolate;
}

[data-beam="${n}"][data-active] {
${Vi(n,"beam-fade-in",0.6)}
}

[data-beam="${n}"][data-fading] {
${Vi(n,"beam-fade-out",0.5)}
}

[data-beam="${n}"][data-active]::after,
[data-beam="${n}"][data-fading]::after {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: ${r}px;
  padding: ${l}px;
  clip-path: inset(0 round ${r}px);
  background: ${x};
  -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  mask-composite: exclude;
  pointer-events: none;
  z-index: 2;
  will-change: opacity, filter;
  opacity: calc(var(--beam-opacity-${n}) * ${S} * var(--beam-stroke-opacity, 1) * var(--beam-strength, 1));
  ${P}
}

[data-beam="${n}"][data-active]::before,
[data-beam="${n}"][data-fading]::before {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: ${r}px;
  clip-path: inset(0 round ${r}px);
  background: ${L};
  -webkit-mask-image:
    linear-gradient(white, transparent 28px, transparent calc(100% - 28px), white),
    linear-gradient(to right, white, transparent 28px, transparent calc(100% - 28px), white);
  -webkit-mask-composite: source-over;
  mask-image:
    linear-gradient(white, transparent 28px, transparent calc(100% - 28px), white),
    linear-gradient(to right, white, transparent 28px, transparent calc(100% - 28px), white);
  mask-composite: add;
  pointer-events: none;
  z-index: 1;
  will-change: opacity, filter;
  opacity: calc(var(--beam-opacity-${n}) * ${m} * var(--beam-inner-opacity, 1) * var(--beam-strength, 1));
  ${P}
}

[data-beam="${n}"] [data-beam-bloom] {
  display: none;
  position: absolute;
  inset: 0;
  border-radius: ${r}px;
  clip-path: inset(0 round ${r}px);
  background: ${T};
  -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  mask-composite: exclude;
  padding: ${l}px;
  pointer-events: none;
  z-index: 3;
  will-change: opacity;
  opacity: 0;
}

[data-beam="${n}"][data-active] [data-beam-bloom],
[data-beam="${n}"][data-fading] [data-beam-bloom] {
  display: block;
  opacity: calc(var(--beam-opacity-${n}) * ${f} * var(--beam-bloom-opacity, 1) * var(--beam-strength, 1));
  ${N}
}

@keyframes beam-fade-in-${n} { to { --beam-opacity-${n}: 1; } }
@keyframes beam-fade-out-${n} { from { --beam-opacity-${n}: 1; } to { --beam-opacity-${n}: 0; } }
${Xt(n)}

@media (prefers-reduced-motion: reduce) {
  [data-beam="${n}"][data-active],
  [data-beam="${n}"][data-fading],
  [data-beam="${n}"][data-active]::after,
  [data-beam="${n}"][data-fading]::after,
  [data-beam="${n}"][data-active]::before,
  [data-beam="${n}"][data-fading]::before,
  [data-beam="${n}"][data-active] [data-beam-bloom],
  [data-beam="${n}"][data-fading] [data-beam-bloom] {
    animation: none !important;
  }
}
`}function Dg(e){let{id:n,borderRadius:r,duration:l,strokeOpacity:t,innerOpacity:u,bloomOpacity:i,colorVariant:o,staticColors:s,brightness:c,saturation:d,hueRange:a,theme:v,hairlineOpacity:h=0}=e,g=v==="dark",y=o==="mono"?0.5:1,S=(t*y).toFixed(2),m=(u*y).toFixed(2),f=(i*y).toFixed(2),p=g?"70, 70, 70":"0, 0, 0",w=h.toFixed(2),k=`linear-gradient(rgba(${p}, ${w}), rgba(${p}, ${w}))`,{op:E}=Yc("pulse-outside",v,l),x=g?3:6,L=g?22.5:15,T=c.toFixed(2),V=d.toFixed(2),I=s?`filter: brightness(${T}) saturate(${V});`:`filter: hue-rotate(calc(var(--beam-hue-base, 0deg) + var(--beam-hue-${n}))) brightness(${T}) saturate(${V});`,B=`brightness(var(--beam-glow-brightness, ${T})) saturate(var(--beam-glow-saturate, ${V}))`,q=s?`filter: blur(var(--beam-core-blur, ${x}px)) ${B};`:`filter: blur(var(--beam-core-blur, ${x}px)) hue-rotate(calc(var(--beam-hue-base, 0deg) + var(--beam-hue-${n}))) ${B};`,Y=s?`filter: blur(var(--beam-bloom-blur, ${L}px)) ${B};`:`filter: blur(var(--beam-bloom-blur, ${L}px)) hue-rotate(calc(var(--beam-hue-base, 0deg) + var(--beam-hue-${n}))) ${B};`,R=nm(em,o,n),z=nm(em,o,n),F=um(Sg,o,1-E*0.5),ne=h>0?`${R},
    ${k}`:R;return`
${im(n)}

[data-beam="${n}"] {
  position: relative;
  border-radius: ${r}px;
  overflow: visible;
  isolation: isolate;
}

[data-beam="${n}"][data-active] {
${Vi(n,"beam-fade-in",0.6)}
}

[data-beam="${n}"][data-fading] {
${Vi(n,"beam-fade-out",0.5)}
}
${h>0?`
/* Idle hairline — painted above the (opaque) child in the inner 1px edge ring so
   it overlaps a standard inset component border exactly. */
[data-beam="${n}"]::after {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: ${r}px;
  padding: 1px;
  clip-path: inset(0 round ${r}px);
  background: ${k};
  -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  mask-composite: exclude;
  pointer-events: none;
  z-index: 2;
}
`:""}
[data-beam="${n}"][data-active]::after,
[data-beam="${n}"][data-fading]::after {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: ${r}px;
  padding: 1px;
  clip-path: inset(0 round ${r}px);
  background: ${ne};
  -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  mask-composite: exclude;
  pointer-events: none;
  z-index: 2;
  will-change: opacity, filter;
  opacity: calc(var(--beam-opacity-${n}) * ${S} * var(--beam-stroke-opacity, 1) * var(--beam-strength, 1));
  ${I}
}

[data-beam="${n}"][data-active]::before,
[data-beam="${n}"][data-fading]::before {
  content: "";
  position: absolute;
  inset: -10px;
  z-index: -1;
  border-radius: ${r+10}px;
  background: ${z};
  transform: scale(0.95, 0.9);
  pointer-events: none;
  will-change: opacity, filter;
  opacity: calc(var(--beam-opacity-${n}) * ${m} * var(--beam-inner-opacity, 1) * var(--beam-strength, 1));
  ${q}
}

[data-beam="${n}"] [data-beam-bloom] {
  display: none;
  position: absolute;
  inset: -30px;
  z-index: -1;
  border-radius: ${r+30}px;
  background: ${F};
  transform: scale(0.95, 0.9);
  pointer-events: none;
  will-change: transform;
  opacity: 0;
}

[data-beam="${n}"][data-active] [data-beam-bloom],
[data-beam="${n}"][data-fading] [data-beam-bloom] {
  display: block;
  opacity: calc(var(--beam-opacity-${n}) * ${f} * var(--beam-bloom-opacity, 1) * var(--beam-strength, 1));
  ${Y}
}

@keyframes beam-fade-in-${n} { to { --beam-opacity-${n}: 1; } }
@keyframes beam-fade-out-${n} { from { --beam-opacity-${n}: 1; } to { --beam-opacity-${n}: 0; } }
${Xt(n)}

@media (prefers-reduced-motion: reduce) {
  [data-beam="${n}"][data-active],
  [data-beam="${n}"][data-fading],
  [data-beam="${n}"][data-active]::after,
  [data-beam="${n}"][data-fading]::after,
  [data-beam="${n}"][data-active]::before,
  [data-beam="${n}"][data-fading]::before,
  [data-beam="${n}"][data-active] [data-beam-bloom],
  [data-beam="${n}"][data-fading] [data-beam-bloom] {
    animation: none !important;
  }
}
`}function Ig(e){let{id:n,borderRadius:r,borderWidth:l,duration:t,strokeOpacity:u,innerOpacity:i,bloomOpacity:o,innerShadow:s,colorVariant:c,staticColors:d,brightness:a,saturation:v,hueRange:h,theme:g}=e,y=Math.max(0,r-l),S=g==="dark",m=u,f=i,p=o,w=d?"":`animation: beam-hue-shift-${n} 12s ease-in-out infinite;`,k=d?"":`animation: beam-hue-shift-bloom-${n} 8s ease-in-out infinite;`,E=d?"":`
@keyframes beam-hue-shift-${n} {
  0% { filter: hue-rotate(calc(var(--beam-hue-base, 0deg) - ${h}deg)) brightness(${a.toFixed(2)}) saturate(${v.toFixed(2)}); }
  50% { filter: hue-rotate(calc(var(--beam-hue-base, 0deg) + ${h}deg)) brightness(${a.toFixed(2)}) saturate(${v.toFixed(2)}); }
  100% { filter: hue-rotate(calc(var(--beam-hue-base, 0deg) - ${h}deg)) brightness(${a.toFixed(2)}) saturate(${v.toFixed(2)}); }
}

@keyframes beam-hue-shift-bloom-${n} {
  0% { filter: blur(8px) hue-rotate(calc(var(--beam-hue-base, 0deg) - ${h+10}deg)) brightness(${a.toFixed(2)}) saturate(${v.toFixed(2)}); }
  50% { filter: blur(8px) hue-rotate(calc(var(--beam-hue-base, 0deg) + ${h+10}deg)) brightness(${a.toFixed(2)}) saturate(${v.toFixed(2)}); }
  100% { filter: blur(8px) hue-rotate(calc(var(--beam-hue-base, 0deg) - ${h+10}deg)) brightness(${a.toFixed(2)}) saturate(${v.toFixed(2)}); }
}`,P=S?`radial-gradient(
        ellipse calc(24px * var(--beam-w-${n})) calc(28px * var(--beam-h-${n})) at calc(var(--beam-x-${n}) * 100%) calc(100% + 2px),
        rgba(255, 255, 255, 0.38) 0%,
        rgba(255, 255, 255, 0.12) 30%,
        transparent 65%
      )`:`radial-gradient(
        ellipse calc(35px * var(--beam-w-${n})) calc(28px * var(--beam-h-${n})) at calc(var(--beam-x-${n}) * 100%) calc(100% + 2px),
        rgba(0, 0, 0, 0.6) 0%,
        rgba(0, 0, 0, 0.25) 35%,
        transparent 70%
      )`,N=mg(c,S,n),x=hg(c,n),L=gg(c,S,n),T=c==="mono"?"filter: blur(6px);":"";return`
@property --beam-x-${n} {
  syntax: "<number>";
  initial-value: 0;
  inherits: true;
}

@property --beam-w-${n} {
  syntax: "<number>";
  initial-value: 1;
  inherits: true;
}

@property --beam-h-${n} {
  syntax: "<number>";
  initial-value: 1;
  inherits: true;
}

@property --beam-spike-${n} {
  syntax: "<number>";
  initial-value: 1;
  inherits: true;
}

@property --beam-spike2-${n} {
  syntax: "<number>";
  initial-value: 1;
  inherits: true;
}

@property --beam-edge-${n} {
  syntax: "<number>";
  initial-value: 1;
  inherits: true;
}

@property --beam-opacity-${n} {
  syntax: "<number>";
  initial-value: 0;
  inherits: true;
}

[data-beam="${n}"] {
  position: relative;
  border-radius: ${r}px;
  overflow: hidden;
}

[data-beam="${n}"][data-active] {
  animation:
    beam-travel-${n} ${t}s linear infinite,
    beam-edge-fade-${n} ${t}s linear infinite,
    beam-breathe-${n} ${(t*1.3).toFixed(1)}s ease-in-out infinite,
    beam-spike-${n} ${(t*1.33).toFixed(1)}s ease-in-out infinite,
    beam-spike2-${n} ${(t*1.7).toFixed(1)}s ease-in-out infinite,
    beam-fade-in-${n} 0.6s ease forwards;
}

[data-beam="${n}"][data-fading] {
  animation:
    beam-travel-${n} ${t}s linear infinite,
    beam-edge-fade-${n} ${t}s linear infinite,
    beam-breathe-${n} ${(t*1.3).toFixed(1)}s ease-in-out infinite,
    beam-spike-${n} ${(t*1.33).toFixed(1)}s ease-in-out infinite,
    beam-spike2-${n} ${(t*1.7).toFixed(1)}s ease-in-out infinite,
    beam-fade-out-${n} 0.5s ease forwards;
}

[data-beam="${n}"][data-active]::after,
[data-beam="${n}"][data-fading]::after {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: ${y}px;
  padding: ${l}px;
  clip-path: inset(0 round ${r}px);
  background: ${P}, ${N};
  -webkit-mask:
    radial-gradient(
      ellipse calc(78px * var(--beam-w-${n})) calc(60px * var(--beam-h-${n})) at calc(var(--beam-x-${n}) * 100%) 100%,
      white 0%, rgba(255, 255, 255, 0.5) 45%, transparent 100%
    ),
    linear-gradient(#fff 0 0) content-box,
    linear-gradient(#fff 0 0);
  -webkit-mask-composite: source-in, xor;
  mask:
    radial-gradient(
      ellipse calc(78px * var(--beam-w-${n})) calc(60px * var(--beam-h-${n})) at calc(var(--beam-x-${n}) * 100%) 100%,
      white 0%, rgba(255, 255, 255, 0.5) 45%, transparent 100%
    ),
    linear-gradient(#fff 0 0) content-box,
    linear-gradient(#fff 0 0);
  mask-composite: intersect, exclude;
  pointer-events: none;
  z-index: 2;
  opacity: calc(var(--beam-opacity-${n}) * var(--beam-edge-${n}) * ${m.toFixed(2)} * var(--beam-stroke-opacity, 1) * var(--beam-strength, 1));
  ${w}
}

[data-beam="${n}"][data-active]::before,
[data-beam="${n}"][data-fading]::before {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: ${r}px;
  background: ${x};
  box-shadow: inset 0 0 9px 1px ${s};
  -webkit-mask-image:
    radial-gradient(
      ellipse calc(78px * var(--beam-w-${n})) calc(60px * var(--beam-h-${n})) at calc(var(--beam-x-${n}) * 100%) 100%,
      white 0%, rgba(255, 255, 255, 0.5) 45%, transparent 100%
    ),
    linear-gradient(white, transparent 28px, transparent calc(100% - 28px), white),
    linear-gradient(to right, white, transparent 28px, transparent calc(100% - 28px), white);
  -webkit-mask-composite: source-in, source-over;
  mask-image:
    radial-gradient(
      ellipse calc(78px * var(--beam-w-${n})) calc(60px * var(--beam-h-${n})) at calc(var(--beam-x-${n}) * 100%) 100%,
      white 0%, rgba(255, 255, 255, 0.5) 45%, transparent 100%
    ),
    linear-gradient(white, transparent 28px, transparent calc(100% - 28px), white),
    linear-gradient(to right, white, transparent 28px, transparent calc(100% - 28px), white);
  mask-composite: intersect, add;
  pointer-events: none;
  z-index: 1;
  opacity: calc(var(--beam-opacity-${n}) * var(--beam-edge-${n}) * ${f.toFixed(2)} * var(--beam-inner-opacity, 1) * var(--beam-strength, 1));
  clip-path: inset(0 round ${r}px);
  ${w}
}

[data-beam="${n}"] [data-beam-bloom] {
  display: none;
  position: absolute;
  inset: 0;
  border-radius: ${y}px;
  clip-path: inset(0 round ${r}px);
  padding: 0;
  -webkit-mask: radial-gradient(
    ellipse calc(84px * var(--beam-w-${n})) calc(110px * var(--beam-h-${n})) at calc(var(--beam-x-${n}) * 100%) 100%,
    white 0%, rgba(255, 255, 255, 0.5) 35%, transparent 100%
  );
  -webkit-mask-composite: source-over;
  mask: radial-gradient(
    ellipse calc(84px * var(--beam-w-${n})) calc(110px * var(--beam-h-${n})) at calc(var(--beam-x-${n}) * 100%) 100%,
    white 0%, rgba(255, 255, 255, 0.5) 35%, transparent 100%
  );
  mask-composite: add;
  background: ${L};
  ${T}
  pointer-events: none;
  z-index: 3;
  opacity: 0;
}

[data-beam="${n}"][data-active] [data-beam-bloom],
[data-beam="${n}"][data-fading] [data-beam-bloom] {
  display: block;
  opacity: calc(var(--beam-opacity-${n}) * var(--beam-edge-${n}) * ${p.toFixed(2)} * var(--beam-bloom-opacity, 1) * var(--beam-strength, 1));
  ${k}
}

@keyframes beam-travel-${n} {
  0%   { --beam-x-${n}: 0.06;  --beam-w-${n}: 0.5; }
  10%  { --beam-x-${n}: 0.15;  --beam-w-${n}: 0.8; }
  20%  { --beam-x-${n}: 0.25;  --beam-w-${n}: 1.1; }
  30%  { --beam-x-${n}: 0.35;  --beam-w-${n}: 1.3; }
  40%  { --beam-x-${n}: 0.44;  --beam-w-${n}: 1.45; }
  50%  { --beam-x-${n}: 0.5;   --beam-w-${n}: 1.5; }
  60%  { --beam-x-${n}: 0.56;  --beam-w-${n}: 1.45; }
  70%  { --beam-x-${n}: 0.65;  --beam-w-${n}: 1.3; }
  80%  { --beam-x-${n}: 0.75;  --beam-w-${n}: 1.1; }
  90%  { --beam-x-${n}: 0.85;  --beam-w-${n}: 0.8; }
  100% { --beam-x-${n}: 0.94;  --beam-w-${n}: 0.5; }
}

@keyframes beam-edge-fade-${n} {
  0%    { --beam-edge-${n}: 0; }
  12.5% { --beam-edge-${n}: 0; }
  32.5% { --beam-edge-${n}: 1; }
  67.5% { --beam-edge-${n}: 1; }
  87.5% { --beam-edge-${n}: 0; }
  100%  { --beam-edge-${n}: 0; }
}

@keyframes beam-breathe-${n} {
  0%, 100% { --beam-h-${n}: 0.8; }
  25%      { --beam-h-${n}: 1.25; }
  55%      { --beam-h-${n}: 0.85; }
  80%      { --beam-h-${n}: 1.3; }
}

@keyframes beam-spike-${n} {
  0%   { --beam-spike-${n}: 0.8; }
  25%  { --beam-spike-${n}: 1.3; }
  50%  { --beam-spike-${n}: 0.9; }
  75%  { --beam-spike-${n}: 1.4; }
  100% { --beam-spike-${n}: 0.8; }
}

@keyframes beam-spike2-${n} {
  0%   { --beam-spike2-${n}: 1.2; }
  25%  { --beam-spike2-${n}: 0.7; }
  50%  { --beam-spike2-${n}: 1.4; }
  75%  { --beam-spike2-${n}: 0.8; }
  100% { --beam-spike2-${n}: 1.2; }
}

@keyframes beam-fade-in-${n} {
  to { --beam-opacity-${n}: 1; }
}

@keyframes beam-fade-out-${n} {
  from { --beam-opacity-${n}: 1; }
  to { --beam-opacity-${n}: 0; }
}
${E}
${Xt(n)}
`}var Qi=new Set,Ql=null,Ac=0,Rg=31.333333333333336,Fg=Math.PI*2;function rm(e){return(1-Math.cos(Fg*e))/2}function om(e){if(Ql=requestAnimationFrame(om),e-Ac<Rg)return;Ac=e;let n=e/1000;Qi.forEach(({el:r,config:l})=>{for(let t of l.oscillators){let u=(n-t.delay)/t.period,i=t.a+(t.b-t.a)*rm(u);r.style.setProperty(t.prop,t.unit==="px"?`${i.toFixed(2)}px`:i.toFixed(4))}if(l.hue){let{prop:t,range:u,period:i,continuous:o}=l.hue,s=o?n/i%1*u:-u+2*u*rm(n/i);r.style.setProperty(t,`${s.toFixed(2)}deg`)}})}function Og(){Ql==null&&(Ac=0,Ql=requestAnimationFrame(om))}function Mg(){Qi.size===0&&Ql!=null&&(cancelAnimationFrame(Ql),Ql=null)}function Ug(e,n){let r={el:e,config:n};return Qi.add(r),Og(),()=>{Qi.delete(r),Mg()}}function jg(){let[e,n]=ce.useState(()=>typeof window>"u"||window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light");return ce.useEffect(()=>{if(typeof window>"u")return;let r=window.matchMedia("(prefers-color-scheme: dark)"),l=(t)=>{n(t.matches?"dark":"light")};return r.addEventListener("change",l),()=>r.removeEventListener("change",l)},[]),e}function Vg(e,n){return e==="auto"?n:e}var sm=ce.forwardRef(function({children:e,size:n="md",colorVariant:r="colorful",theme:l="dark",staticColors:t=!1,duration:u,active:i=!0,borderRadius:o,brightness:s,saturation:c,hueRange:d=30,strength:a=1,className:v,style:h,onActivate:g,onDeactivate:y,onAnimationEnd:S,...m},f){let p=ce.useId().replace(/:/g,"-"),w=jg(),k=ce.useRef(null),[E,P]=ce.useState(i),[N,x]=ce.useState(!1),[L,T]=ce.useState(!0),[V,I]=ce.useState(null),[B,q]=ce.useState({x:1,y:1});ce.useEffect(()=>{if(o!=null)return;let W=k.current;if(!W)return;let le=()=>{let ve=W.firstElementChild;if(!ve)return;let U=getComputedStyle(ve),Z=parseFloat(U.borderTopLeftRadius);!isNaN(Z)&&Z>0&&I(Z)};le();let Ce=new MutationObserver(le);return Ce.observe(W,{childList:!0,subtree:!1}),()=>Ce.disconnect()},[o,e]),ce.useEffect(()=>{i&&!E&&!N?P(!0):!i&&E&&!N&&x(!0)},[i,E,N]),ce.useEffect(()=>{let W=k.current;if(!W||typeof IntersectionObserver>"u")return;let le=new IntersectionObserver((Ce)=>{for(let ve of Ce)T(ve.isIntersecting)},{rootMargin:"256px"});return le.observe(W),()=>le.disconnect()},[]),ce.useEffect(()=>{if(n!=="pulse-outside"){q({x:1,y:1});return}let W=k.current;if(!W)return;let le=350,Ce=140,ve=0.35,U=4,Z=(Dn)=>Math.max(ve,Math.min(U,Dn)),b=()=>{let Dn=W.firstElementChild;if(!Dn)return;let Xe=Dn.getBoundingClientRect();if(!Xe.width||!Xe.height)return;let M=+Z(Xe.width/le).toFixed(3),X=+Z(Xe.height/Ce).toFixed(3);q((ue)=>ue.x===M&&ue.y===X?ue:{x:M,y:X})};if(b(),typeof ResizeObserver>"u")return;let Le=W.firstElementChild;if(!Le)return;let Gn=new ResizeObserver(b);return Gn.observe(Le),()=>Gn.disconnect()},[n,e]);let Y=ce.useCallback((W)=>{let le=W.animationName;le.includes("fade-out")?(P(!1),x(!1),y==null||y()):le.includes("fade-in")&&(g==null||g()),S==null||S(W)},[g,y,S]),R=Vg(l,w),z=$c[n][R],F=og[n],ne=n==="pulse-inner"||n==="pulse-outside",re=o??V??F.borderRadius,ie=u??(n==="line"?3.1:ne?2.3:1.96),Q=c??z.saturation,j=s??z.brightness??1.3,$=n==="line"?Math.min(d,13):d,H=r==="mono"?!0:t,A=ce.useMemo(()=>zg({id:p,borderRadius:re,borderWidth:F.borderWidth,duration:ie,strokeOpacity:z.strokeOpacity,innerOpacity:z.innerOpacity,bloomOpacity:z.bloomOpacity,innerShadow:z.innerShadow,size:n,colorVariant:r,staticColors:H,brightness:j,saturation:Q,hueRange:$,theme:R,hairlineOpacity:z.hairlineOpacity}),[p,re,F.borderWidth,ie,z.strokeOpacity,z.innerOpacity,z.bloomOpacity,z.innerShadow,z.hairlineOpacity,n,r,H,j,Q,$,R]),me=ce.useMemo(()=>ne?_g(n,R,ie,$,H,p):null,[ne,n,R,ie,$,H,p]);ce.useEffect(()=>{var W;if(!me||!(E||N)||!L)return;let le=k.current;if(le&&!(typeof window<"u"&&((W=window.matchMedia)!=null&&W.call(window,"(prefers-reduced-motion: reduce)").matches)))return Ug(le,me)},[me,E,N,L]);let ke=ce.useCallback((W)=>{k.current=W,typeof f=="function"?f(W):f&&(f.current=W)},[f]),Se={...h??{},"--beam-strength":Math.max(0,Math.min(1,a)),...n==="pulse-outside"?{"--pulse-glow-sx":B.x,"--pulse-glow-sy":B.y}:{}};return Er.jsxs(Er.Fragment,{children:[Er.jsx("style",{nonce:"oracle-onboarding-effects",children:A}),Er.jsxs("div",{...m,ref:ke,"data-beam":p,"data-active":E&&!N?"":void 0,"data-fading":N?"":void 0,"data-paused":E&&!N&&!L?"":void 0,className:v,style:Se,onAnimationEnd:Y,children:[e,Er.jsx("div",{"data-beam-bloom":!0})]})]})});var Zn=In(Mt(),1),qt=new Map,Zc=()=>matchMedia("(prefers-reduced-motion: reduce)").matches||document.body.classList.contains("reduced");function cm(e,n){let r=qt.get(e);if(!r)r=fm.createRoot(e),qt.set(e,r);if(dm.flushSync(()=>r.render(n)),Zc())Uc();return()=>{r.unmount(),qt.delete(e)}}window.OracleOnboardingEffects={button(e,{label:n,onClick:r,disabled:l=!1}){return cm(e,Zn.jsx(am.default.Fragment,{children:Zn.jsxs("button",{className:"ob2-metal-button",type:"button",onClick:r,disabled:l,"aria-label":n,children:[Zn.jsx("span",{className:"ob2-metal-art","aria-hidden":"true",children:Zn.jsx(b0,{scale:2.08,theme:"dark",metalOpacity:0.72,children:""})}),Zn.jsx("span",{className:"ob2-metal-label",children:n})]})}))},beam(e){return cm(e,Zn.jsx(sm,{borderRadius:16,size:"md",colorVariant:"colorful",theme:"dark",strength:1,brightness:2.2,duration:3,active:!Zc(),className:"ob2-beam-effect",children:Zn.jsx("div",{className:"ob2-beam-fill"})}))},destroy(e){let n=qt.get(e);if(n)n.unmount(),qt.delete(e)}};function Gc(){if(document.hidden||Zc())Uc();else L0()}document.addEventListener("visibilitychange",Gc);matchMedia("(prefers-reduced-motion: reduce)").addEventListener("change",Gc);new MutationObserver(Gc).observe(document.body,{attributes:!0,attributeFilter:["class"]});})();
