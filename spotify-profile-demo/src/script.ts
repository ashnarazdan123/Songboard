const clientId = "9a43dbe4e2e841439cd88fb75af42212"; // Replace with your client ID
const params = new URLSearchParams(window.location.search);
const code = params.get("code");

if (!code) {
    redirectToAuthCodeFlow(clientId);
} else {
    const accessToken = await getAccessToken(clientId, code);
    const profile = await fetchProfile(accessToken);
    populateUI(profile);
    //const player = await fetchPlayer(accessToken);
    //populateUI(profile, player);
    let lastPlayerState: any = null; //stores prev data to avoid constant changing when data isn't updating
    //to update data every second 
    setInterval(async () => {
        try{
            const player = await fetchPlayer(accessToken);

            if (
                !lastPlayerState ||                                  //if no lastPlayerState
                player?.item?.name !==lastPlayerState?.item?.name || //if new song
                player?.progress_ms !== lastPlayerState?.progress_ms //if song progress changed (it's playing)
            ) { //update and store new state
                populateUIPlayback(player);
                lastPlayerState = player;
            }
        } catch (err) {
            console.error('Failed to fetch player:', err);
        }
    }, 1000);
}


//functions for authorizing account access
 async function redirectToAuthCodeFlow(clientId: string) {
    const verifier = generateCodeVerifier(128);
    const challenge = await generateCodeChallenge(verifier);

    localStorage.setItem("verifier", verifier);

    const params = new URLSearchParams();
    params.append("client_id", clientId);
    params.append("response_type", "code");
    params.append("redirect_uri", "http://127.0.0.1:5173/callback");
    params.append("scope", "user-read-private user-read-email user-read-playback-state");
    params.append("code_challenge_method", "S256");
    params.append("code_challenge", challenge);

    document.location = `https://accounts.spotify.com/authorize?${params.toString()}`;
}

function generateCodeVerifier(length: number) {
    let text = '';
    let possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

    for (let i = 0; i < length; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}

async function generateCodeChallenge(codeVerifier: string) {
    const data = new TextEncoder().encode(codeVerifier);
    const digest = await window.crypto.subtle.digest('SHA-256', data);
    return btoa(String.fromCharCode.apply(null, [...new Uint8Array(digest)]))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
}

//get access token for fetching data from API
export async function getAccessToken(clientId: string, code: string): Promise<string> {
    const verifier = localStorage.getItem("verifier");

    const params = new URLSearchParams();
    params.append("client_id", clientId);
    params.append("grant_type", "authorization_code");
    params.append("code", code);
    params.append("redirect_uri", "http://127.0.0.1:5173/callback");
    params.append("code_verifier", verifier!);

    const result = await fetch("https://accounts.spotify.com/api/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params
    });

    const { access_token } = await result.json();
    return access_token;
}

async function fetchProfile(token: string): Promise<any> {
    const result = await fetch("https://api.spotify.com/v1/me", {
        method: "GET", headers: { Authorization: `Bearer ${token}` }
    });

    return await result.json();
}

async function fetchPlayer(token: string): Promise<any> {
    const result = await fetch("https://api.spotify.com/v1/me/player", {
        method: "GET", headers: { Authorization: `Bearer ${token}` }
    });

    if (result.status === 204) return null; //if nothing playing

    return await result.json();
}

function populateUI(profile: any) {
    document.getElementById("displayName")!.innerText = profile.display_name;
    if (profile.images[0]) {
        const profileImage = new Image(200, 200);
        profileImage.src = profile.images[0].url;
        document.getElementById("avatar")!.appendChild(profileImage);
    }
    document.getElementById("id")!.innerText = profile.id;
    document.getElementById("email")!.innerText = profile.email;
    document.getElementById("uri")!.innerText = profile.uri;
    document.getElementById("uri")!.setAttribute("href", profile.external_urls.spotify);
    document.getElementById("url")!.innerText = profile.href;
    document.getElementById("url")!.setAttribute("href", profile.href);
    document.getElementById("imgUrl")!.innerText = profile.images[0]?.url ?? '(no profile image)'; //? = "if it exists, else do stuff after '??'"
}

//populate song info separately (avoids needing to reupdate any profile info on screen)
function populateUIPlayback(player: any) {
    document.getElementById("songName")!.innerText = player?.item? `${player.item.name} - ${player.item.artists[0].name}`: 'No song currently playing.';
    if (player?.item) {
        document.getElementById("progressLi")!.style.display = 'list-item';
        document.getElementById("progress")!.innerText = `${formatTime(player.progress_ms)} / ${formatTime(player.item.duration_ms)}`; //backticks = f-string but for TS
    } else {
        document.getElementById("progressLi")!.style.display = 'none';
    }
}

function formatTime(ms: number) { //into mm:ss
    let seconds = Math.floor(ms / 1000);
    let time = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
    return time;
}