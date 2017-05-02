/**
 * Created by tigran on 5/2/17.
 */
const request = require('request')
    , async = require('async');

// isrc argument
let isrc_encoded = (([].concat(process.argv)).slice(2)).join(":");
let isrc_value = process.argv[3]; // TODO: we need some argument checking!!

const getSpotifyData = (isrc_string) => {
    return new Promise(function (resolve, reject) {
        request.get('https://api.spotify.com/v1/search?query=' + isrc_string +' &type=track', function (err, httpResponse, body) {
            body = JSON.parse(body);
            if(body.tracks.items.length === 0) {
                reject("There is no Spotify tracks for this isrc");
                return;
            }

            // picking up just a first item
            let track = body.tracks.items[0];
            let resolve_data = {
                spotifyId: track.album.id,
                artists: []
            };

            for(let i in track.artists) {
                resolve_data.artists.push({
                    spotifyId: track.artists[i].id,
                    name: track.artists[i].name
                });
            }

            resolve(resolve_data);
        });
    });
};


const mbrainzData = (data, isrc_val) => {
    return new Promise(function (resolve, reject) {
        console.log(isrc_val);
        request.get('https://musicbrainz.org/ws/2/isrc/' + isrc_val +'?inc=artist-credits&fmt=json', function (err, httpResponse, body) {
            body = JSON.parse(body);
            data.artists = [
                // {id: '', name: ''}
            ];

            for(let i in body.recodings) {
                let ac = body.recodings[i]["artist-credit"];
                for(let j in ac) {
                    data.artists.push({
                        id: ac.artist.id,
                        name: ac.artist.name,
                    });
                }
            }

            resolve(data);
        });
    });
};

const artistsInfo = (data) => {

    return new Promise(function (resolve, reject) {
        async.eachSeries(data.artists, function (artist, next) {
            request.get('http://musicbrainz.org/ws/2/artist/' + artist.id +'?fmt=json', function (err, httpResponse, body) {
                body = JSON.parse(body);
                artist.country = body.country;
                next();
            });
        }, function () {
            resolve(data);
        });
    });
};

getSpotifyData(isrc_encoded)
    .then((data) => {
        return mbrainzData(data, isrc_value);
    })
    .then((data) => {
        return artistsInfo(data);
    })
    .then((data) => {
        console.log(data);
    })
    .catch((error) => {
        console.log(error);
    });