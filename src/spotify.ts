import axios, { AxiosResponse } from "axios";

const API: string = "https://api.spotify.com/v1";

export interface ISpotifyOptions {
    clientId: string;

    clientSecret: string;
}

export default class Spotify {
    private readonly options: ISpotifyOptions;

    private token?: string = undefined;

    constructor(options: ISpotifyOptions) {
        this.options = options;
    }

    private send(path: string): Promise<AxiosResponse<any>> {
        return axios(API + path, {
            headers: {
                "Authorization": `Bearer ${this.token}`
            },

            validateStatus: status => (status >= 200 && status < 300) || status == 401
        });
    }

    private async generate(): Promise<string> {
        const URL = "https://accounts.spotify.com/api/token";

        const data = new URLSearchParams({
            grant_type: "client_credentials",
            client_id: this.options.clientId,
            client_secret: this.options.clientSecret
        })

        const request = await axios(URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded"
            },
            data: data.toString()
        });

        return request.data["access_token"];
    }

    private async middleware(path: string): Promise<any> {
        let request = await this.send(path);
        
        if (request.status == 401) {
            this.token = await this.generate();

            request = await this.send(path);
        }

        return request.data;
    }
 
    public tracks(query: string) {
        return this.middleware(`/search?q=${query}&type=track`);
    }

    public artists(query: string) {
        return this.middleware(`/search?q=${query}&type=artist`);
    }

    public genres() {
        return this.middleware('/recommendations/available-genre-seeds');
    }

    public recommendations(artists: string[], genres: string[]) {
        return this.middleware(`/recommendations?seed_artists=${artists}&seed_genres=${genres}`);
    }

    public track(id: string) {
        return this.middleware(`/tracks/${id}`);
    }
}
