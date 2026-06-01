package com.smartattend.ui.admin

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.ImageButton
import android.widget.TextView
import androidx.recyclerview.widget.DiffUtil
import androidx.recyclerview.widget.ListAdapter
import androidx.recyclerview.widget.RecyclerView
import com.smartattend.R
import com.smartattend.domain.model.Student

class AdminStudentsAdapter(
    private val onEdit: (Student) -> Unit,
    private val onDelete: (Student) -> Unit,
    private val onActivate: (Student) -> Unit
) : ListAdapter<Student, AdminStudentsAdapter.VH>(DIFF) {

    class VH(view: View) : RecyclerView.ViewHolder(view) {
        val tvInitial: TextView = view.findViewById(R.id.tvInitial)
        val tvName: TextView = view.findViewById(R.id.tvName)
        val tvStudentId: TextView = view.findViewById(R.id.tvStudentId)
        val tvRollNumber: TextView = view.findViewById(R.id.tvRollNumber)
        val tvEmail: TextView = view.findViewById(R.id.tvEmail)
        val tvPhone: TextView = view.findViewById(R.id.tvPhone)
        val tvClass: TextView = view.findViewById(R.id.tvClass)
        val tvStatusBadge: TextView = view.findViewById(R.id.tvStatusBadge)
        val btnEdit: ImageButton = view.findViewById(R.id.btnEdit)
        val btnActivate: ImageButton = view.findViewById(R.id.btnActivate)
        val btnDelete: ImageButton = view.findViewById(R.id.btnDelete)
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): VH =
        VH(LayoutInflater.from(parent.context).inflate(R.layout.item_admin_student, parent, false))

    override fun onBindViewHolder(holder: VH, position: Int) {
        val item = getItem(position)
        val isActive = item.isActive ?: true
        
        holder.tvInitial.text = item.name.firstOrNull()?.uppercase() ?: "?"
        holder.tvName.text = item.name
        holder.tvStudentId.text = item.studentId
        holder.tvRollNumber.text = item.rollNumber?.let { "Roll: $it" } ?: ""
        holder.tvEmail.text = item.email
        holder.tvPhone.text = item.phone ?: "No phone"
        holder.tvClass.text = "${item.className ?: "No class"} ${item.classSection ?: ""}".trim()
        
        // Status Handling
        holder.tvStatusBadge.visibility = if (isActive) View.GONE else View.VISIBLE
        holder.btnActivate.visibility = if (isActive) View.GONE else View.VISIBLE
        holder.btnDelete.visibility = if (isActive) View.VISIBLE else View.GONE
        
        holder.btnEdit.setOnClickListener { onEdit(item) }
        holder.btnActivate.setOnClickListener { onActivate(item) }
        holder.btnDelete.setOnClickListener { onDelete(item) }
    }

    companion object {
        private val DIFF = object : DiffUtil.ItemCallback<Student>() {
            override fun areItemsTheSame(a: Student, b: Student) = a.id == b.id
            override fun areContentsTheSame(a: Student, b: Student) = a == b
        }
    }
}
