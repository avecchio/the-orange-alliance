import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { FTCDatabase } from '../../providers/ftc-database';
import { MatchSorter, MatchType } from '../../util/match-utils';
import { EventSorter } from '../../util/event-utils';
import { TheOrangeAllianceGlobals } from '../../app.globals';
import {$} from 'protractor';
import Team from '../../models/Team';
import Match from '../../models/Match';
import Season from '../../models/Season';
import Event from '../../models/Event';

@Component({
  selector: 'toa-team',
  templateUrl: './team.component.html',
  styleUrls: ['./team.component.scss'],
  providers: [FTCDatabase, TheOrangeAllianceGlobals]
})
export class TeamComponent implements OnInit {

  eventSorter: EventSorter;

  team: Team;
  teamKey: number;

  years: any;

  qualMatches: Match[];
  quartersMatches: Match[];
  semisMatches: Match[];
  finalsMatches: Match[];

  seasons: Season[];
  currentSeason: Season;

  constructor(private ftc: FTCDatabase, private route: ActivatedRoute, private router: Router, private app: TheOrangeAllianceGlobals) {
    this.teamKey = this.route.snapshot.params['team_key'];
    // this.currentSeason = { season_key: '1718', description: 'Relic Recovery' };
    this.qualMatches = [];
    this.quartersMatches = [];
    this.semisMatches = [];
    this.finalsMatches = [];
    this.eventSorter = new EventSorter();
  }

  public ngOnInit(): void {
    this.years = [];
    this.ftc.getTeam(this.teamKey, "1718").then((data: Team) => {
      if (!data) {
        this.router.navigate(['/not-found']);
      } else {
        this.team = data;
        for (let i = this.team.rookieYear; i <= new Date().getFullYear(); i++) {
          this.years.push(i);
        }
        this.years.reverse();
        if (this.team.rookieYear) {
          this.ftc.getAllSeasons().then((data: Season[]) => {
            this.seasons = this.getTeamSeasons(data).reverse();
            this.selectSeason(this.seasons[0]);
          });
        }
        this.app.setTitle(this.team.teamNameShort + ' (' + this.team.teamKey + ')');
      }
    });
  }

  public getTeamSeasons(seasons: Season[]) {
    const year_code = parseInt((this.team.rookieYear + '').toString().substring(2, 4));
    const second_code = year_code + 1;
    let rookie_season_id = '';
    if (year_code < 10) {
      rookie_season_id = '0' + year_code;
    } else {
      rookie_season_id = '' + year_code;
    }
    if (second_code < 10) {
      rookie_season_id += '0' + second_code;
    } else {
      rookie_season_id += '' + second_code;
    }
    for (let i = 0; i < seasons.length; i++) {
      if (rookie_season_id === seasons[i].seasonKey) {
        return seasons.splice(i, seasons.length - 1);
      }
    }
  }

  public selectSeason(season: any) {
    this.currentSeason = season;
    this.team.events = [];
    this.ftc.getTeamEvents(this.teamKey, this.currentSeason.seasonKey).then((data: Event[]) => {
      this.team.events = data;
      this.getEventMatches();
    }).catch(() => {
      this.team.events = [];
    });
  }

  private getEventMatches() {
    this.team.events = this.eventSorter.sortRev(this.team.events, 0, this.team.events.length - 1);
    for (const event of this.team.events) {
      this.ftc.getEventMatches(event.eventKey).then((data: Match[]) => {
        event.matches = data;
        event.matches = this.sortAndFind(event);
        this.getEventRankings();
        this.getEventAwards();
      });
    }
  }

  private getEventRankings() {
    for (const ranking of this.team.rankings) {
      for (const event of this.team.events) {
        if (ranking.eventKey === event.eventKey) {
          event.rankings = [ranking];
        }
      }
    }
  }

  private getEventAwards() {
    for (const event of this.team.events) {
      const awards = [];
      for (const award of this.team.awards) {
        if (event.eventKey === award.eventKey) {
          if (award.awardName.substring(0, 7) === 'Inspire') {
            awards.push(award);
          }
        }
      }

      for (const award of this.team.awards) {
        if (event.eventKey === award.eventKey) {
          if (award.awardName.substr(-8, 8) === 'Alliance') {
            awards.push(award);
          }
        }
      }

      for (const award of this.team.awards) {
        if (event.eventKey === award.eventKey) {
          if ((award.awardName.substring(0, 7) !== 'Inspire') && (award.awardName.substr(-8, 8) !== 'Alliance')) {
            awards.push(award);
          }
        }
      }

      event.awards = awards;
    }
  }

  private sortAndFind(event: Event): Match[] {
    let teamMatches = [];
    for (const match of event.matches) {
      for (const team of match.participants) {
        if (team.teamKey === this.teamKey) {
          teamMatches.push(match);
        }
      }
    }

    const sorter = new MatchSorter();
    teamMatches = sorter.sort(teamMatches, 0, teamMatches.length - 1);
    return teamMatches;
  }

  openTeamPage(team_number: any) {
    this.router.navigate(['/']);
  }

  openMatchDetails(match_data: any) {
    this.router.navigate(['/matches', match_data.match_key]);
  }

  getSeasonString(season: any) {
    const code_one = season.season_key.toString().substring(0, 2);
    const code_two = season.season_key.toString().substring(2, 4);
    return '20' + code_one + '/20' + code_two + (season.description ? ' - ' + season.description : '');
  }
}
