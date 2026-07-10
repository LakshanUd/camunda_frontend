import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-processes',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './processes.component.html',
  styleUrls: ['./processes.component.css']
})
export class ProcessesComponent implements OnInit {
  processes: any[] = [];

  constructor(private http: HttpClient) {}

  ngOnInit() {
    // 1. Fetch all active processes
    this.http.get<any[]>('http://localhost:8082/api/processes').subscribe(data => {
      this.processes = data;
      
      // 2. Loop through each process and fetch its running instance count
      this.processes.forEach(process => {
        this.http.get<any>(`http://localhost:8082/api/processes/${process.id}/instances/count`)
          .subscribe(countData => {
            // Dynamically add a new property called 'instanceCount' to our process object
            process.instanceCount = countData.count; 
          });
      });
    });
  }
}