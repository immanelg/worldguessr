import { useEffect, useState } from "react"
import dynamic from "next/dynamic";
import { FaMap } from "react-icons/fa";
import useWindowDimensions from "./useWindowDimensions";
import GameOptions from "./gameOptionsModal";
import EndBanner from "./endBanner";
import calcPoints from "./calcPoints";
import findCountry from "./findCountry";
import BannerText from "./bannerText";
import PlayerList from "./playerList";
import { FaExpand, FaMinimize, FaThumbtack } from "react-icons/fa6";
import { useTranslation } from 'next-i18next'
import CountryBtns from "./countryButtons";
import OnboardingText from "./onboardingText";

const MapWidget = dynamic(() => import("../components/Map"), { ssr: false });

export default function GameUI({ countryGuesserCorrect, setCountryGuesserCorrect, otherOptions, onboarding, setOnboarding, countryGuesser, options, timeOffset, ws, multiplayerState, backBtnPressed, setMultiplayerState, countryStreak, setCountryStreak, loading, setLoading, session, gameOptionsModalShown, setGameOptionsModalShown, latLong, streetViewShown, setStreetViewShown, loadLocation, gameOptions, setGameOptions, showAnswer, setShowAnswer, pinPoint, setPinPoint, hintShown, setHintShown, xpEarned, setXpEarned, showCountryButtons, setShowCountryButtons }) {
  const { t: text } = useTranslation("common");

  function loadLocationFunc() {
    if(onboarding) {
      if(onboarding.round === 5) {
        setOnboarding((prev)=>{
          return {
          completed: true,
          points: prev.points,
          timeTaken: Date.now() - prev.startTime
          }
        })
      } else
      setOnboarding((prev) => {
        return {
          ...prev,
          round: prev.round + 1,
          nextRoundTime: 0
        }
      })
    } else
      loadLocation()
  }

  const { width, height } = useWindowDimensions();
  // how to determine if touch screen?
  let isTouchScreen = false;
  if(window.matchMedia("(pointer: coarse)").matches) {
    isTouchScreen = true;
  }

  const [miniMapShown, setMiniMapShown] = useState(false)
  const [miniMapExpanded, setMiniMapExpanded] = useState(false)
  const [miniMapFullscreen, setMiniMapFullscreen] = useState(false)
  const [roundStartTime, setRoundStartTime] = useState(null);
  const [lostCountryStreak, setLostCountryStreak] = useState(0);
  const [timeToNextMultiplayerEvt, setTimeToNextMultiplayerEvt] = useState(0);
  const [timeToNextRound, setTimeToNextRound] = useState(0); //only for onboarding
  const [mapPinned, setMapPinned] = useState(false);
  // dist between guess & target
  const [km, setKm] = useState(null);
  const [onboardingTextShown, setOnboardingTextShown] = useState(false);
  const [onboardingWords, setOnboardingWords] = useState([]);


  useEffect(() => {

    const interval = setInterval(() => {
    if(multiplayerState?.inGame && multiplayerState?.gameData?.nextEvtTime) {
      setTimeToNextMultiplayerEvt(Math.max(0,Math.floor(((multiplayerState.gameData.nextEvtTime - Date.now()) - timeOffset) / 100)/10))
    }
    }, 100)

    return () => {
      clearInterval(interval)
    }
  }, [multiplayerState, timeOffset])

  useEffect(() => {
    if(onboarding?.nextRoundTime) {
      const interval = setInterval(() => {
      console.log("setting timetonextroun")
      const val = Math.max(0,Math.floor(((onboarding.nextRoundTime - Date.now())) / 100)/10)
        setTimeToNextRound(val)

        if(val === 0) {
          setOnboarding((prev) => {
            return {
              ...prev,
              nextRoundTime: Date.now() + 20000
            }
          });
          setOnboardingWords([
            text("onboardingTimeEnd")
          ])
          setOnboardingTextShown(true);
        }
      }, 100)

      return () => {
        clearInterval(interval)
      }
    }
  }, [onboarding?.nextRoundTime])

  useEffect(() => {
    if(multiplayerState?.inGame) return;
    if (!latLong) {
      setLoading(true)
      setStreetViewShown(false)
    } else {
      setRoundStartTime(Date.now());
      setXpEarned(0);
    }
  }, [latLong, multiplayerState])

  useEffect(() => {
    window.localStorage.setItem("countryStreak", countryStreak);
  }, [countryStreak])

  useEffect(() => {
    if(onboarding) {
      setOnboardingTextShown(true);
      if( onboarding.round === 1) {
        setOnboardingWords([
        text("welcomeToWorldguessr")+"!",
        text("onboarding2"),
        text("onboarding3"),
        text("onboarding4"),
      ])
    } else if(onboarding.round === 2) {
      setOnboardingWords([
        text("greatJob"),
        text("onboarding5"),
      ])
    } else if(onboarding.round === 3) {
      setOnboardingWords([
        text("astounding"),
        text("onboarding6"),
        text("onboarding7"),
        text("onboarding8"),
        text("onboarding9"),
      ])
    } else if(onboarding.round === 4) {
      setOnboardingWords([
        text("onboarding10")
      ])
    } else if(onboarding.round === 5) {
      setOnboardingWords([
        text("finalRound"),
      ])
    }
  }
  }, [onboarding?.round])


  useEffect(() => {
    function keydown(e) {
      if(pinPoint && e.key === ' ' && !showAnswer) {
        guess();
      } else if(showAnswer && e.key === ' ') {
        loadLocationFunc()
      }
    }
    // on space key press, guess
    document.addEventListener('keydown', keydown);
    return () => {
      document.removeEventListener('keydown', keydown);
    }
  }, [pinPoint, showAnswer, onboarding, xpEarned]);

  useEffect(() => {
    if (!loading && latLong && width > 600 && !isTouchScreen) {
      setMiniMapShown(true)
    } else {
      setMiniMapShown(false)
    }
  }, [loading, latLong, width])

  function showHint() {
    setHintShown(true)
  }
  useEffect(() => {
    loadLocation()
  }, [gameOptions?.location])
  function guess() {
    setShowAnswer(true)
    if(showCountryButtons || setShowCountryButtons)setShowCountryButtons(false);
    if(onboarding) {
      setOnboarding((prev) => {

        return {
          ...prev,
          nextRoundTime:0,
          points: (prev.points??0) + (countryGuesser?2500:calcPoints({ lat: latLong.lat, lon: latLong.long, guessLat: pinPoint.lat, guessLon: pinPoint.lng, usedHint: hintShown, maxDist: 20000}))
        }
      })
      setTimeToNextRound(0)
    }
    if(multiplayerState?.inGame) return;

    console.log(xpEarned)
    if(xpEarned > 0 && session?.token?.secret) {
      fetch('/api/storeGame', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          secret: session.token.secret,
          lat: pinPoint.lat,
          long: pinPoint.lng,
          usedHint: hintShown,
          actualLat: latLong.lat,
          actualLong: latLong.long,
          maxDist: gameOptions.maxDist,
          roundTime: Math.round((Date.now() - roundStartTime)/ 1000)
        })
      }).then(res => res.json()).then(data => {
        if(data.error) {
          console.error(data.error);
          return;
        }
      }).catch(e => {
        console.error(e);
      });
    }

    if(gameOptions.location === 'all' && pinPoint) {
    findCountry({ lat: pinPoint.lat, lon: pinPoint.lng }).then((country) => {

      setLostCountryStreak(0);
      if(country === latLong.country) {
        setCountryStreak(countryStreak + 1);
      } else {
        setCountryStreak(0);
        setLostCountryStreak(countryStreak);
      }
    });
    }
  }

  useEffect(() => {
    if(!latLong || !pinPoint || multiplayerState?.inGame) return;
    setXpEarned(Math.round(calcPoints({ lat: latLong.lat, lon: latLong.long, guessLat: pinPoint.lat, guessLon: pinPoint.lng, usedHint: hintShown, maxDist: gameOptions.maxDist }) / 50))
  }, [km, latLong, pinPoint])

  function fixBranding() {
    try{
    document.querySelector("a[rel=noopener]")?.remove()
    }catch(e){}
  }
  useEffect(() => {
    const int= setInterval(() => {
      fixBranding();
    },500)
    return () => {
      clearInterval(int)
    }
  },[])


  useEffect(() => {
    // const map =  new google.maps.Map(document.getElementById("map"), {
    //   center: fenway,
    //   zoom: 14,
    // });
    if(!latLong) return;


    const panorama = new google.maps.StreetViewPanorama(
      document.getElementById("googlemaps"),
      {
        position: { lat: latLong.lat, lng: latLong.long },
        pov: {
          heading: 0,
          pitch: 0,
        },
        motionTracking: false,
        linksControl: gameOptions?.nm ? false:true,
        clickToGo: gameOptions?.nm ? false:true,

        panControl: gameOptions?.npz ? false:true,
        zoomControl: gameOptions?.npz ? false:true,
        showRoadLabels: gameOptions?.showRoadName===true?true:false,
        disableDefaultUI: true,
      },
    );


    // pano onload

    function fixPitch() {
      // point towards road

      panorama.setPov(panorama.getPhotographerPov());
      panorama.setZoom(0);
    }

    let loaded = false;

    panorama.addListener("pano_changed", () => {
      if(loaded) return;
      loaded = true;
      setTimeout(() => {
      setLoading(false)
      setStreetViewShown(true)
      }, 200)
      fixBranding();

      fixPitch();
    });


    return () => {
    }


  }, [latLong, gameOptions?.nm, gameOptions?.npz, gameOptions?.showRoadName])

  return (
    <div className="gameUI">
      { latLong && multiplayerState?.gameData?.state !== 'end' && (
      // <iframe className={`streetview ${(!streetViewShown || loading || showAnswer) ? 'hidden' : ''} ${false ? 'multiplayer' : ''} ${gameOptions?.nmpz ? 'nmpz' : ''}`} src={`https://www.google.com/maps/embed/v1/streetview?location=${latLong.lat},${latLong.long}&key=AIzaSyA2fHNuyc768n9ZJLTrfbkWLNK3sLOK-iQ&fov=90`} id="streetview" referrerPolicy='no-referrer-when-downgrade' allow='accelerometer; autoplay; clipboard-write; encrypted-media; picture-in-picture' onLoad={() => {

      // }}></iframe>
      <div id="googlemaps" className={`streetview inverted ${(!streetViewShown || loading || showAnswer ||  (multiplayerState?.gameData?.state === 'getready') || !latLong) ? 'hidden' : ''} ${false ? 'multiplayer' : ''} ${(gameOptions?.npz) ? 'nmpz' : ''}`}></div>

      )}
{/*


',

*/}



      {(!countryGuesser || (countryGuesser && showAnswer)) && (!multiplayerState || (multiplayerState.inGame && ['guess', 'getready'].includes(multiplayerState.gameData?.state))) && ((multiplayerState?.inGame && multiplayerState?.gameData?.curRound === 1) ? multiplayerState?.gameData?.state === "guess" : true ) && (
        <>


      <div id="miniMapArea" onMouseEnter={() => {
        setMiniMapExpanded(true)
      }} onMouseLeave={() => {
        if(mapPinned) return;
        setMiniMapExpanded(false)
      }} className={`miniMap ${miniMapExpanded ? 'mapExpanded' : ''} ${miniMapShown ? 'shown' : ''} ${showAnswer ? 'answerShown' : 'answerNotShown'} ${miniMapFullscreen&&miniMapExpanded ? 'fullscreen' : ''}`}>

{!showAnswer && (
<div className="mapCornerBtns desktop" style={{ visibility: miniMapExpanded ? 'visible' : 'hidden' }}>
          <button className="cornerBtn" onClick={() => {
            setMiniMapFullscreen(!miniMapFullscreen)
            if(!miniMapFullscreen) {
              setMiniMapExpanded(true)
            }
          }}>{miniMapFullscreen  ? (
            <FaMinimize />
          ) : (
            <FaExpand />
          )}</button>
          <button className="cornerBtn" onClick={() => {
            setMapPinned(!mapPinned)
          }}>
            <FaThumbtack style={{ transform: mapPinned ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />
          </button>
        </div>
)}
        {latLong && !loading && <MapWidget focused={miniMapExpanded} options={options} ws={ws} gameOptions={gameOptions} answerShown={showAnswer} session={session} showHint={hintShown} pinPoint={pinPoint} setPinPoint={setPinPoint} guessed={false} guessing={false} location={latLong} setKm={setKm} multiplayerState={multiplayerState} />}


        <div className={`miniMap__btns ${showAnswer ? 'answerShownBtns' : ''}`}>
          <button className={`miniMap__btn ${!pinPoint||(multiplayerState?.inGame && multiplayerState?.gameData?.players.find(p => p.id === multiplayerState?.gameData?.myId)?.final) ? 'unavailable' : ''} guessBtn`} disabled={!pinPoint||(multiplayerState?.inGame && multiplayerState?.gameData?.players.find(p => p.id === multiplayerState?.gameData?.myId)?.final)} onClick={guess}>
           {multiplayerState?.inGame && multiplayerState?.gameData?.players.find(p => p.id === multiplayerState?.gameData?.myId)?.final ? multiplayerState?.gameData?.players?.reduce((acc, cur) => {if(cur.final) return acc - 1;return acc;}, multiplayerState?.gameData?.players.length) > 0 ? `${text("waitingForPlayers", {p:multiplayerState?.gameData?.players?.reduce((acc, cur) => {if(cur.final) return acc - 1;return acc;}, multiplayerState?.gameData?.players.length)})}...` : `${text("waiting")}...` : text("guess")}
            </button>

          { !multiplayerState?.inGame && (
          <button className={`miniMap__btn hintBtn ${hintShown ? 'hintShown' : ''}`} onClick={showHint}>{text('hint')}</button>
          )}
        </div>
      </div>

      <div className={`mobile_minimap__btns ${miniMapShown ? 'miniMapShown' : ''} ${showAnswer ? 'answerShownBtns' : ''}`}>
        {miniMapShown && (
          <>
            {/* guess and hint  */}

            <button className={`miniMap__btn ${!pinPoint||(multiplayerState?.inGame && multiplayerState?.gameData?.players.find(p => p.id === multiplayerState?.gameData?.myId)?.final) ? 'unavailable' : ''} guessBtn`} disabled={!pinPoint||(multiplayerState?.inGame && multiplayerState?.gameData?.players.find(p => p.id === multiplayerState?.gameData?.myId)?.final)} onClick={guess}>
           {multiplayerState?.inGame && multiplayerState?.gameData?.players.find(p => p.id === multiplayerState?.gameData?.myId)?.final ? multiplayerState?.gameData?.players?.reduce((acc, cur) => {if(cur.final) return acc - 1;return acc;}, multiplayerState?.gameData?.players.length) > 0 ? `${text("waitingForPlayers", {p: multiplayerState?.gameData?.players?.reduce((acc, cur) => {if(cur.final) return acc - 1;return acc;}, multiplayerState?.gameData?.players.length)})}...` :  `${text("waiting")}...` : text("guess")}
            </button>

          { !multiplayerState?.inGame && (
          <button className={`miniMap__btn hintBtn ${hintShown ? 'hintShown' : ''}`} onClick={showHint}>{text('hint')}</button>
          )}
          </>
        )}
        <button className={`gameBtn ${miniMapShown ? 'mobileMiniMapExpandedToggle' : ''}`} onClick={() => {
          setMiniMapShown(!miniMapShown)
        }}><FaMap size={miniMapShown ? 30 : 50} /></button>
      </div>
      </>
      )}

      { countryGuesser && otherOptions && (
        <CountryBtns countries={otherOptions} shown={!loading && showCountryButtons && !showAnswer}

         onCountryPress={(country) => {
          const isCorrect = country === latLong.country;
          if(!isCorrect && onboarding) {
            setOnboardingWords([
              "Not quite. Try again!",
            ])
            setOnboardingTextShown(true);
            setCountryGuesserCorrect(false);
          } else {
            setCountryGuesserCorrect(true);
            guess()
          }
         }}/>
      )}

      {onboarding && (
        <OnboardingText onboarding={onboarding} shown={!loading && onboardingTextShown}
        words={onboardingWords} pageDone={()=>{
          setShowCountryButtons(true)
          setOnboardingTextShown(false)
          if(onboarding?.round >= 2) {
          setOnboarding((prev) => {
            return {
              ...prev,
              nextRoundTime: Date.now() + 20000
            }
          })
        }
        }} />
      )}
      <span className={`timer ${(loading||showAnswer||!multiplayerState||(multiplayerState?.gameData?.state === 'getready' && multiplayerState?.gameData?.curRound === 1)||multiplayerState?.gameData?.state === 'end') ? '' : 'shown'}`}>

{/* Round #{multiplayerState?.gameData?.curRound} / {multiplayerState?.gameData?.rounds} - {timeToNextMultiplayerEvt}s */}
      {text("roundTimer", {r:multiplayerState?.gameData?.curRound, mr: multiplayerState?.gameData?.rounds, t: timeToNextMultiplayerEvt})}
        </span>

        <span className={`timer ${(loading||showAnswer||!onboarding) ? '' : 'shown'}`}>

{/* Round #{multiplayerState?.gameData?.curRound} / {multiplayerState?.gameData?.rounds} - {timeToNextMultiplayerEvt}s */}
      {timeToNextRound ?
      text("roundTimer", {r:onboarding?.round, mr: 5, t: timeToNextRound})
      : text("round", {r:onboarding?.round, mr: 5})}

        </span>

        {multiplayerState && multiplayerState.inGame && multiplayerState?.gameData?.state === 'getready' && multiplayerState?.gameData?.curRound === 1 && (
          <BannerText text={
            text("gameStartingIn", {t:timeToNextMultiplayerEvt})
          } shown={true} />
        )}


        {multiplayerState && multiplayerState.inGame && ((multiplayerState?.gameData?.state === 'getready' && timeToNextMultiplayerEvt < 5 && multiplayerState?.gameData?.curRound !== 1 && multiplayerState?.gameData?.curRound <= multiplayerState?.gameData?.rounds)||(multiplayerState?.gameData?.state === "end")) && (
          <PlayerList multiplayerState={multiplayerState} playAgain={() => {


            backBtnPressed(true)

          }} backBtn={() => {

            backBtnPressed()
          }} />
        )}

      <GameOptions singleplayer={!multiplayerState?.inGame} shown={gameOptionsModalShown} onClose={() => {
        setGameOptionsModalShown(false)
      }} gameOptions={gameOptions} setGameOptions={setGameOptions} />

{/* <EndBanner xpEarned={xpEarned} usedHint={showHint} session={session} lostCountryStreak={lostCountryStreak} guessed={guessed} latLong={latLong} pinPoint={pinPoint} countryStreak={countryStreak} fullReset={fullReset} km={km} playingMultiplayer={playingMultiplayer} /> */}
<EndBanner onboarding={onboarding} countryGuesser={countryGuesser} countryGuesserCorrect={countryGuesserCorrect} options={options} countryStreak={countryStreak} lostCountryStreak={lostCountryStreak} xpEarned={xpEarned} usedHint={hintShown} session={session}  guessed={showAnswer} latLong={latLong} pinPoint={pinPoint} fullReset={()=>{
loadLocationFunc()
  }} km={km} multiplayerState={multiplayerState} />

    </div>
  )
}